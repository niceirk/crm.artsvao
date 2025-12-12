import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3StorageService } from '../../common/services/s3-storage.service';
import { MessagesEventsService } from '../../messages/messages-events.service';
import { TelegramState } from '@prisma/client';
import axios from 'axios';
import { TelegramMessage } from '../interfaces/telegram-api.interface';
import { TelegramApiService } from './telegram-api.service';
import { TelegramStateService } from './telegram-state.service';
import { TelegramIdentificationService } from './telegram-identification.service';

/**
 * Сервис обработки сообщений (текст, фото, документы)
 */
@Injectable()
export class TelegramMessagingService {
  private readonly logger = new Logger(TelegramMessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: TelegramApiService,
    private readonly stateService: TelegramStateService,
    private readonly identificationService: TelegramIdentificationService,
    private readonly s3Storage: S3StorageService,
    private readonly messagesEventsService: MessagesEventsService,
  ) {}

  /**
   * Обработка текстового сообщения
   */
  async handleTextMessage(
    message: TelegramMessage,
    textOverride?: string,
  ): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    const telegramAccount = await this.stateService.getOrCreateAccount(
      message.from,
      chatId,
    );

    // Проверяем актуальность связи с клиентом
    if (
      await this.identificationService.checkAndHandleConnectionLoss(
        telegramAccount,
        chatId,
        telegramUserId,
      )
    ) {
      return;
    }

    // Обработка кнопки "Просто написать"
    if (
      telegramAccount.state === TelegramState.WAITING_FOR_PHONE &&
      message.text === '❌ Просто написать'
    ) {
      await this.stateService.updateState(
        BigInt(telegramUserId),
        TelegramState.GUEST,
      );
      await this.apiService.sendMessage(
        chatId,
        'Хорошо! Вы можете продолжить общение с нашими менеджерами.',
        { remove_keyboard: true },
      );
      return;
    }

    // Если пользователь застрял в CHOOSING_FROM_MULTIPLE
    if (telegramAccount.state === TelegramState.CHOOSING_FROM_MULTIPLE) {
      const messageText = message.text.toLowerCase().trim();

      if (
        messageText === 'отмена' ||
        messageText === 'отменить' ||
        messageText === 'cancel'
      ) {
        await this.stateService.updateStateById(
          telegramAccount.id,
          telegramAccount.clientId
            ? TelegramState.IDENTIFIED
            : TelegramState.GUEST,
        );
        await this.apiService.sendMessage(
          chatId,
          '✅ Действие отменено. Вы можете написать нам сообщение или задать вопрос.',
          { remove_keyboard: true },
        );
        this.logger.log(
          `User ${telegramUserId} canceled from CHOOSING_FROM_MULTIPLE via text`,
        );
        return;
      }

      await this.apiService.sendMessage(
        chatId,
        '⚠️ Пожалуйста, выберите нужный контакт из списка выше, нажав на соответствующую кнопку.\n\n' +
          'Если вашего имени нет в списке, нажмите "❌ Нет моего имени в списке".\n\n' +
          'Для отмены введите "отмена" или /cancel',
      );
      return;
    }

    // Если это NEW_USER - предлагаем идентификацию
    if (telegramAccount.state === TelegramState.NEW_USER) {
      await this.identificationService.offerIdentification(chatId, telegramUserId);
      await this.stateService.updateState(
        BigInt(telegramUserId),
        TelegramState.WAITING_FOR_PHONE,
      );
    }

    // Сохраняем сообщение
    await this.saveInboundMessage(
      telegramAccount.id,
      telegramAccount.clientId,
      textOverride || message.text,
    );
  }

  /**
   * Обработка фото
   */
  async handlePhoto(message: TelegramMessage): Promise<void> {
    if (!message.photo || message.photo.length === 0) {
      this.logger.warn('Received photo message without photo array');
      return;
    }

    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    const telegramAccount = await this.stateService.getOrCreateAccount(
      message.from,
      chatId,
    );

    if (
      await this.identificationService.checkAndHandleConnectionLoss(
        telegramAccount,
        chatId,
        telegramUserId,
      )
    ) {
      return;
    }

    const conversation = await this.stateService.getOrCreateConversation(
      telegramAccount.id,
      telegramAccount.clientId,
    );

    await this.markOutboundAsRead(conversation.id);

    try {
      const largestPhoto = message.photo[message.photo.length - 1];

      const fileInfo = await this.apiService.getFileInfo(largestPhoto.file_id);
      if (!fileInfo) {
        throw new Error('Failed to get file info');
      }

      // Скачиваем файл из Telegram
      const imageResponse = await axios.get(fileInfo.fileUrl, {
        responseType: 'arraybuffer',
      });

      // Подготавливаем файл для загрузки в S3
      const file: Express.Multer.File = {
        buffer: Buffer.from(imageResponse.data),
        originalname: `telegram-photo-${largestPhoto.file_id}.jpg`,
        mimetype: 'image/jpeg',
        size: largestPhoto.file_size || imageResponse.data.length,
      } as Express.Multer.File;

      const uploadResult = await this.s3Storage.uploadImage(file, 'telegram-photos');

      const createdMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          senderType: 'CLIENT',
          text: message.caption || null,
          payload: {
            imageUrl: uploadResult.imageUrl,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            width: uploadResult.width,
            height: uploadResult.height,
            mimeType: uploadResult.mimeType,
            telegramFileId: largestPhoto.file_id,
            telegramFileUrl: fileInfo.fileUrl,
          },
          category: 'CHAT',
          isReadByClient: true,
          isReadByManager: false,
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      this.logger.log(
        `Photo message saved to conversation ${conversation.id}, S3 URL: ${uploadResult.imageUrl}`,
      );

      await this.notifyNewInbound(conversation.id, createdMessage.createdAt);
    } catch (error) {
      this.logger.error(`Failed to process photo: ${error.message}`, error.stack);

      const fallbackMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          senderType: 'CLIENT',
          text: message.caption || '[Фото не удалось загрузить]',
          category: 'CHAT',
          isReadByClient: true,
          isReadByManager: false,
        },
      });

      await this.notifyNewInbound(conversation.id, fallbackMessage.createdAt);
    }
  }

  /**
   * Обработка документа
   */
  async handleDocument(message: TelegramMessage): Promise<void> {
    // TODO: Сохранение документа и отображение в чате
    await this.handleTextMessage(message, '[Документ отправлен]');
  }

  /**
   * Отправить сообщение клиенту по conversation ID
   */
  async sendMessageToConversation(
    conversationId: string,
    text: string,
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { telegramAccount: true },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    await this.apiService.sendMessage(conversation.telegramAccount.chatId, text);

    await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'MANAGER',
        text,
        category: 'CHAT',
        isReadByClient: false,
        isReadByManager: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Message sent to conversation ${conversationId}`);
  }

  /**
   * Сохранить входящее сообщение
   */
  private async saveInboundMessage(
    telegramAccountId: string,
    clientId: string | null,
    text: string,
  ): Promise<void> {
    const conversation = await this.stateService.getOrCreateConversation(
      telegramAccountId,
      clientId,
    );

    await this.markOutboundAsRead(conversation.id);

    const createdMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        senderType: 'CLIENT',
        text,
        category: 'CHAT',
        isReadByClient: true,
        isReadByManager: false,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Message saved to conversation ${conversation.id}`);

    await this.notifyNewInbound(conversation.id, createdMessage.createdAt);
  }

  /**
   * Пометить исходящие сообщения как прочитанные
   */
  private async markOutboundAsRead(conversationId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        direction: 'OUTBOUND',
        isReadByClient: false,
      },
      data: {
        isReadByClient: true,
      },
    });
  }

  /**
   * Оповещение фронта о новом входящем сообщении
   */
  private async notifyNewInbound(
    conversationId: string,
    createdAt: Date,
  ): Promise<void> {
    this.messagesEventsService.emitNewMessage(conversationId, createdAt);
    const count = await this.countUnread();
    this.messagesEventsService.emitUnreadCount(count);
  }

  /**
   * Подсчет непрочитанных входящих для менеджеров
   */
  private async countUnread(): Promise<number> {
    return this.prisma.message.count({
      where: {
        direction: 'INBOUND',
        isReadByManager: false,
      },
    });
  }
}
