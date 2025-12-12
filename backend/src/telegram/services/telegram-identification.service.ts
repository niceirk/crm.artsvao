import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramState } from '@prisma/client';
import { normalizePhone } from '../../common/utils/phone.util';
import { TelegramMessage, TelegramCallbackQuery } from '../interfaces/telegram-api.interface';
import { ClientSelectionInfo } from '../interfaces/state-context.interface';
import { TelegramApiService } from './telegram-api.service';
import { TelegramStateService } from './telegram-state.service';
import { TelegramKeyboardService } from './telegram-keyboard.service';
import { formatClientName, escapeHtml } from '../utils/format.util';

/**
 * Сервис идентификации пользователей по номеру телефона
 */
@Injectable()
export class TelegramIdentificationService {
  private readonly logger = new Logger(TelegramIdentificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: TelegramApiService,
    private readonly stateService: TelegramStateService,
    private readonly keyboardService: TelegramKeyboardService,
  ) {}

  /**
   * Обработка контакта (номер телефона)
   */
  async handleContact(message: TelegramMessage): Promise<void> {
    const contact = message.contact;
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    if (!contact || !contact.phone_number) {
      await this.apiService.sendMessage(
        chatId,
        'Не удалось получить номер телефона. Попробуйте еще раз.',
      );
      return;
    }

    // Нормализуем телефон
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(contact.phone_number);
    } catch (error) {
      await this.apiService.sendMessage(
        chatId,
        'Неверный формат телефона. Пожалуйста, отправьте российский номер телефона.',
      );
      return;
    }

    this.logger.log(
      `Processing contact from user ${telegramUserId}, phone: ${normalizedPhone}`,
    );

    // Ищем клиентов по номеру телефона
    const clients = await this.findClientsByPhone(normalizedPhone);

    this.logger.log(`Found ${clients.length} clients for phone ${normalizedPhone}`);

    if (clients.length === 0) {
      await this.handlePhoneNotFound(chatId, telegramUserId, normalizedPhone);
      return;
    }

    if (clients.length === 1) {
      await this.linkTelegramToClient(telegramUserId, chatId, clients[0].id);
      return;
    }

    // Найдено несколько клиентов - показываем выбор
    await this.showClientSelection(chatId, telegramUserId, clients);
  }

  /**
   * Поиск клиентов по телефону
   */
  async findClientsByPhone(phone: string): Promise<ClientSelectionInfo[]> {
    return this.prisma.client.findMany({
      where: {
        OR: [{ phone }, { phoneAdditional: phone }],
        status: { not: 'INACTIVE' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        dateOfBirth: true,
      },
    });
  }

  /**
   * Обработка случая, когда телефон не найден в базе
   */
  async handlePhoneNotFound(
    chatId: number,
    telegramUserId: number,
    phone: string,
  ): Promise<void> {
    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.GUEST,
    );

    await this.apiService.sendMessage(
      chatId,
      '❌ К сожалению, мы не нашли ваш номер телефона.\n\n' +
        'Вы можете:\n' +
        '• Написать нам, и менеджер поможет вам\n' +
        '• Записаться на занятия через наш сайт или позвонить нам',
      { remove_keyboard: true },
    );

    this.logger.log(
      `Phone ${phone} not found for user ${telegramUserId}, set state to GUEST`,
    );
  }

  /**
   * Показать inline клавиатуру для выбора клиента
   */
  async showClientSelection(
    chatId: number,
    telegramUserId: number,
    clients: ClientSelectionInfo[],
  ): Promise<void> {
    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.CHOOSING_FROM_MULTIPLE,
    );

    const keyboard = this.keyboardService.buildClientSelectionKeyboard(clients);

    await this.apiService.sendMessageWithInlineKeyboard(
      chatId,
      `Вот что нам удалось найти. Пожалуйста, выберите нужный контакт:`,
      keyboard,
    );

    this.logger.log(
      `Показан выбор из ${clients.length} клиентов для user ${telegramUserId}`,
    );
  }

  /**
   * Обработка выбора клиента из списка
   */
  async handleClientSelection(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const clientId = callbackQuery.data.replace('select_client_', '');
    const telegramUserId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId) {
      return;
    }

    await this.apiService.answerCallbackQuery(callbackQuery.id, 'Отлично!');

    if (messageId) {
      await this.apiService.editMessageReplyMarkup(chatId, messageId);
    }

    await this.linkTelegramToClient(telegramUserId, chatId, clientId);
  }

  /**
   * Обработка отказа от идентификации
   */
  async handleSkipIdentification(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const telegramUserId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId) {
      return;
    }

    await this.apiService.answerCallbackQuery(callbackQuery.id);

    if (messageId) {
      await this.apiService.editMessageReplyMarkup(chatId, messageId);
    }

    await this.stateService.updateState(BigInt(telegramUserId), TelegramState.GUEST);

    await this.apiService.sendMessage(
      chatId,
      'Хорошо! Вы можете продолжить общение с нашими менеджерами.\n' +
        'Если хотите получать уведомления, сообщите менеджеру ваши данные.',
      { remove_keyboard: true },
    );

    this.logger.log(`User ${telegramUserId} skipped identification, set state to GUEST`);
  }

  /**
   * Предложить идентификацию пользователю
   */
  async offerIdentification(chatId: number, telegramUserId: number): Promise<void> {
    const keyboard = this.keyboardService.buildContactRequestKeyboard();

    await this.apiService.sendMessage(
      chatId,
      'Здравствуйте! 👋\n\n' +
        'Давайте попробуем найти вас по номеру телефона?\n' +
        'Так мы сможем быстрее и точнее ответить на ваш вопрос.\n\n' +
        'Это необязательно — вы можете продолжить общение и без этого.',
      keyboard,
    );

    this.logger.log(`Offered identification to user ${telegramUserId}`);
  }

  /**
   * Привязать Telegram аккаунт к клиенту
   */
  async linkTelegramToClient(
    telegramUserId: number,
    chatId: number,
    clientId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        firstName: true,
        lastName: true,
        middleName: true,
        dateOfBirth: true,
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    await this.stateService.linkToClient(BigInt(telegramUserId), clientId);

    const clientName = formatClientName(
      client.firstName,
      client.lastName,
      client.middleName,
      client.dateOfBirth
    );
    await this.apiService.sendMessage(
      chatId,
      `✅ Отлично, ${escapeHtml(clientName)}!\n\n` +
        'Добро пожаловать в артсвао.ру.\n' +
        'Теперь мы на связи - доступны сообщения и уведомления.',
      { remove_keyboard: true },
    );

    this.logger.log(`Telegram user ${telegramUserId} linked to client ${clientId}`);
  }

  /**
   * Проверить и обработать потерю связи с клиентом
   * @returns true если связь потеряна и показана форма идентификации
   */
  async checkAndHandleConnectionLoss(
    telegramAccount: { id: string; clientId: string | null; state: string },
    chatId: number,
    telegramUserId: number,
  ): Promise<boolean> {
    if (!this.stateService.isClientConnectionLost(telegramAccount)) {
      return false;
    }

    await this.offerIdentification(chatId, telegramUserId);

    await this.stateService.updateStateById(
      telegramAccount.id,
      TelegramState.WAITING_FOR_PHONE,
    );

    this.logger.log(
      `Lost client connection for TelegramAccount ${telegramAccount.id}, offered re-identification`,
    );

    return true;
  }
}
