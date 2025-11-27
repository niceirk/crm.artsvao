import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { S3StorageService } from '../common/services/s3-storage.service';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { LinkConversationDto } from './dto/link-conversation.dto';
import { Prisma, ConversationStatus } from '@prisma/client';
import { MessagesEventsService } from './messages-events.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly s3Storage: S3StorageService,
    private readonly messagesEventsService: MessagesEventsService,
  ) {}

  /**
   * Преобразует BigInt и Decimal в строки для JSON сериализации
   */
  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    // Обработка Prisma Decimal (имеет метод toNumber/toString)
    if (obj && typeof obj === 'object' && typeof obj.toNumber === 'function' && obj.constructor?.name === 'Decimal') {
      return obj.toString();
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigInt(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.serializeBigInt(obj[key]);
        }
      }
      return result;
    }

    return obj;
  }

  /**
   * Получить список диалогов с фильтрацией и пагинацией
   */
  async getConversations(query: GetConversationsQueryDto) {
    const { page = 1, limit = 20, status, source, clientId, search, hasUnread } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {};

    // При активном поиске игнорируем фильтр статуса (показываем закрытые диалоги)
    if (status && !search) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (clientId) {
      // Фильтрация по clientId теперь через TelegramAccount
      where.telegramAccount = {
        clientId,
      };
    }

    // Фильтрация по наличию непрочитанных сообщений
    if (hasUnread) {
      where.messages = {
        some: {
          isReadByManager: false,
          direction: 'INBOUND',
        },
      };
    }

    if (search) {
      // Поиск по клиенту, telegram аккаунту и тексту сообщений
      where.OR = [
        {
          telegramAccount: {
            client: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          telegramAccount: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          // Поиск по тексту сообщений
          messages: {
            some: {
              text: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          telegramAccount: {
            select: {
              id: true,
              telegramUserId: true,
              chatId: true,
              username: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  photoUrl: true,
                  dateOfBirth: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              text: true,
              direction: true,
              senderType: true,
              createdAt: true,
              isReadByManager: true,
              isReadByClient: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isReadByManager: false,
                  direction: 'INBOUND',
                },
              },
            },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const result = {
      data: conversations.map((conv) => ({
        ...conv,
        lastMessage: conv.messages[0] || null,
        messages: undefined,
        unreadCount: conv._count.messages,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return this.serializeBigInt(result);
  }

  /**
   * Получить диалог по ID с историей сообщений
   */
  async getConversationById(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        telegramAccount: {
          select: {
            id: true,
            telegramUserId: true,
            chatId: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            state: true,
            isNotificationsEnabled: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                photoUrl: true,
                dateOfBirth: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    const { messages, ...conversationData } = conversation;

    return this.serializeBigInt({
      conversation: conversationData,
      messages: messages,
    });
  }

  /**
   * Получить новые сообщения после указанной даты
   */
  async getNewMessages(conversationId: string, after?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    const whereCondition: any = {
      conversationId,
    };

    // Если указана дата, загружаем только сообщения после нее
    if (after) {
      whereCondition.createdAt = {
        gt: new Date(after),
      };
    }

    const messages = await this.prisma.message.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.serializeBigInt({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        lastMessageAt: conversation.lastMessageAt,
      },
      messages,
    });
  }

  /**
   * Отправить сообщение в диалог
   */
  async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { telegramAccount: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Cannot send message to closed conversation');
    }

    // Отправляем сообщение через соответствующий канал
    if (conversation.source === 'TELEGRAM') {
      await this.telegramService.sendMessage(
        conversation.telegramAccount.chatId,
        dto.text,
      );
    }

    // Сохраняем сообщение в БД
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'MANAGER',
        senderId,
        text: dto.text,
        category: 'CHAT',
        isReadByClient: false,
        isReadByManager: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Обновляем время последнего сообщения
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Message sent to conversation ${conversationId} by user ${senderId}`);

    return message;
  }

  /**
   * Загрузить изображение в диалог
   */
  async uploadImageMessage(
    conversationId: string,
    senderId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { telegramAccount: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Cannot send message to closed conversation');
    }

    // Загружаем изображение в S3
    const uploadResult = await this.s3Storage.uploadImage(file, 'messages');

    // Отправляем изображение через соответствующий канал
    if (conversation.source === 'TELEGRAM') {
      await this.telegramService.sendPhoto(
        conversation.telegramAccount.chatId,
        uploadResult.imageUrl,
        caption,
      );
    }

    // Сохраняем сообщение в БД с метаданными изображения
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'MANAGER',
        senderId,
        text: caption || null,
        payload: {
          imageUrl: uploadResult.imageUrl,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          width: uploadResult.width,
          height: uploadResult.height,
          mimeType: uploadResult.mimeType,
        },
        category: 'CHAT',
        isReadByClient: false,
        isReadByManager: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Обновляем время последнего сообщения
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(
      `Image message sent to conversation ${conversationId} by user ${senderId}, URL: ${uploadResult.imageUrl}`,
    );

    return message;
  }

  /**
   * Загрузить несколько изображений в диалог
   */
  async uploadImagesMessage(
    conversationId: string,
    senderId: string,
    files: Express.Multer.File[],
    caption?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { telegramAccount: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Cannot send message to closed conversation');
    }

    // Загружаем все изображения в S3
    const uploadPromises = files.map((file) =>
      this.s3Storage.uploadImage(file, 'messages'),
    );
    const uploadResults = await Promise.all(uploadPromises);

    // Отправляем изображения через соответствующий канал
    if (conversation.source === 'TELEGRAM') {
      // Отправляем как media group в Telegram
      for (let i = 0; i < uploadResults.length; i++) {
        const uploadResult = uploadResults[i];
        // Подпись добавляем только к первому фото
        const imageCaption = i === 0 ? caption : undefined;
        await this.telegramService.sendPhoto(
          conversation.telegramAccount.chatId,
          uploadResult.imageUrl,
          imageCaption,
        );
      }
    }

    // Сохраняем сообщение в БД с массивом изображений
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'MANAGER',
        senderId,
        text: caption || null,
        payload: {
          images: uploadResults.map((result) => ({
            imageUrl: result.imageUrl,
            fileName: result.fileName,
            fileSize: result.fileSize,
            width: result.width,
            height: result.height,
            mimeType: result.mimeType,
          })),
        },
        category: 'CHAT',
        isReadByClient: false,
        isReadByManager: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Обновляем время последнего сообщения
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(
      `${files.length} images sent to conversation ${conversationId} by user ${senderId}`,
    );

    return message;
  }

  /**
   * Обновить статус диалога
   */
  async updateConversationStatus(id: string, dto: UpdateConversationStatusDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: dto.status },
    });

    this.logger.log(`Conversation ${id} status updated to ${dto.status}`);

    return updated;
  }

  /**
   * Привязать диалог к клиенту вручную
   */
  async linkConversationToClient(conversationId: string, dto: LinkConversationDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    // Проверяем, существует ли клиент
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // Обновляем TelegramAccount (привязываем к клиенту)
    await this.prisma.telegramAccount.update({
      where: { id: conversation.channelAccountId },
      data: {
        clientId: dto.clientId,
        state: 'BOUND_MANUALLY',
      },
    });

    // Получаем обновленный диалог с полной информацией
    const updated = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        telegramAccount: {
          select: {
            id: true,
            telegramUserId: true,
            chatId: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            state: true,
            isNotificationsEnabled: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                photoUrl: true,
                dateOfBirth: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Conversation ${conversationId} linked to client ${dto.clientId}`,
    );

    return this.serializeBigInt(updated);
  }

  /**
   * Отметить сообщения как прочитанные менеджером
   */
  async markMessagesAsRead(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        isReadByManager: false,
        direction: 'INBOUND',
      },
      data: { isReadByManager: true },
    });

    this.logger.log(`Messages in conversation ${conversationId} marked as read`);

    // Обновляем счётчик непрочитанных для всех клиентов
    await this.broadcastUnreadCount();

    return { success: true };
  }

  /**
   * Подсчитывает общее количество непрочитанных входящих сообщений менеджерами.
   */
  async getUnreadCount(): Promise<number> {
    const count = await this.prisma.message.count({
      where: {
        direction: 'INBOUND',
        isReadByManager: false,
      },
    });
    return count;
  }

  /**
   * Считает и рассылает текущее значение непрочитанных в SSE.
   */
  async broadcastUnreadCount(): Promise<void> {
    const count = await this.getUnreadCount();
    this.messagesEventsService.emitUnreadCount(count);
  }

  /**
   * Хелпер для входящего сообщения: оповестить фронт об увеличении счётчика и новом сообщении.
   */
  async notifyInboundMessage(conversationId: string, createdAt: Date): Promise<void> {
    this.messagesEventsService.emitNewMessage(conversationId, createdAt);
    await this.broadcastUnreadCount();
  }
}
