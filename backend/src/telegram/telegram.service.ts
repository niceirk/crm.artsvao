import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../common/services/s3-storage.service';
import { MessagesEventsService } from '../messages/messages-events.service';
import axios, { AxiosInstance } from 'axios';
import { validate as isValidUUID } from 'uuid';
import { normalizePhone } from '../common/utils/phone.util';
import {
  TelegramMessage,
  TelegramUpdate,
  TelegramUser,
  TelegramReplyKeyboardMarkup,
  TelegramInlineKeyboardMarkup,
  TelegramInlineKeyboardButton,
  TelegramCallbackQuery,
} from './interfaces/telegram-api.interface';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly apiClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly s3Storage: S3StorageService,
    private readonly messagesEventsService: MessagesEventsService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set');
    }

    this.apiClient = axios.create({
      baseURL: `https://api.telegram.org/bot${this.botToken}`,
      timeout: 10000,
    });
  }

  /**
   * Обработка входящего webhook от Telegram
   */
  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Обработка callback query
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
        return;
      }

      const message = update.message;
      if (!message || !message.from) {
        this.logger.warn('Update does not contain a message or sender info');
        return;
      }

      this.logger.log(`Processing message from user ${message.from.id}`);

      // Обработка команд
      if (message.text?.startsWith('/')) {
        await this.handleCommand(message);
        return;
      }

      // Обработка контакта (номер телефона)
      if (message.contact) {
        await this.handleContact(message);
        return;
      }

      // Обработка обычного текстового сообщения
      if (message.text) {
        await this.handleTextMessage(message);
        return;
      }

      // Обработка фото
      if (message.photo) {
        await this.handlePhoto(message);
        return;
      }

      // Обработка документов
      if (message.document) {
        await this.handleDocument(message);
        return;
      }

      this.logger.warn(`Unsupported message type from user ${message.from.id}`);
    } catch (error) {
      this.logger.error(`Error processing update: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Обработка команд бота
   */
  private async handleCommand(message: TelegramMessage): Promise<void> {
    const command = message.text.trim().split(/\s+/)[0].toLowerCase();
    const args = message.text.trim().split(/\s+/).slice(1).filter(Boolean);

    switch (command) {
      case '/start':
        await this.handleStartCommand(message, args);
        break;
      case '/cancel':
        await this.handleCancelCommand(message);
        break;
      case '/stop_notifications':
        await this.handleStopNotifications(message);
        break;
      case '/start_notifications':
        await this.handleStartNotifications(message);
        break;
      default:
        await this.sendMessage(
          message.chat.id,
          'Извините, я не понимаю эту команду. Доступные команды:\n' +
            '/start - начать работу с ботом\n' +
            '/cancel - отменить текущее действие\n' +
            '/stop_notifications - отключить уведомления\n' +
            '/start_notifications - включить уведомления',
        );
    }
  }

  /**
   * Обработка команды /start
   */
  private async handleStartCommand(message: TelegramMessage, args: string[]): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    // Проверяем параметр client_<id> для автопривязки
    let clientId: string | null = null;
    if (args.length > 0 && args[0].startsWith('client_')) {
      clientId = args[0].replace('client_', '');

      // Валидация UUID
      if (!isValidUUID(clientId)) {
        this.logger.warn(`Invalid client UUID received: ${clientId}`);
        await this.sendMessage(
          chatId,
          '❌ Неверная ссылка. Пожалуйста, используйте ссылку, которую вам отправили.',
        );
        return;
      }

      this.logger.log(`Auto-linking user ${telegramUserId} to client ${clientId}`);

      // Проверяем существование клиента ДО привязки
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      if (!client) {
        this.logger.warn(`Client ${clientId} not found for user ${telegramUserId}`);
        await this.sendMessage(
          chatId,
          '❌ Клиент не найден. Пожалуйста, свяжитесь с менеджером для получения корректной ссылки.',
        );
        // Создаем аккаунт БЕЗ привязки
        await this.getOrCreateTelegramAccount(message.from, chatId, null);
        return;
      }

      if (client.status === 'INACTIVE') {
        this.logger.warn(`Client ${clientId} is INACTIVE, denying access for user ${telegramUserId}`);
        await this.sendMessage(
          chatId,
          '❌ Ваш аккаунт неактивен. Пожалуйста, свяжитесь с менеджером.',
        );
        return;
      }

      // Создаем или обновляем TelegramAccount с привязкой
      const telegramAccount = await this.getOrCreateTelegramAccount(
        message.from,
        chatId,
        clientId,
      );

      const clientName = `${client.firstName} ${client.lastName}`;

      await this.sendMessage(
        chatId,
        `Здравствуйте, ${clientName}! 👋\n\n` +
          'Добро пожаловать в артсвао.ру.\n' +
          'Теперь мы на связи - доступны сообщения и уведомления.',
      );

      // Обновляем состояние на IDENTIFIED
      await this.prisma.telegramAccount.update({
        where: { id: telegramAccount.id },
        data: { state: 'IDENTIFIED' },
      });

      // Создаем или находим диалог
      await this.getOrCreateConversation(telegramAccount.id, clientId);
    } else {
      // Новый пользователь без автопривязки
      // Проверяем, не идентифицирован ли уже пользователь
      const existingAccount = await this.prisma.telegramAccount.findUnique({
        where: { telegramUserId: BigInt(telegramUserId) },
        include: { client: { select: { firstName: true, lastName: true } } },
      });

      if (existingAccount && existingAccount.state === 'IDENTIFIED' && existingAccount.client) {
        // Пользователь уже идентифицирован - показываем главное меню
        const clientName = `${existingAccount.client.firstName} ${existingAccount.client.lastName}`;

        const keyboard: TelegramInlineKeyboardButton[][] = [
          [{ text: '💬 Написать сообщение', callback_data: 'write_message' }],
          [{ text: 'ℹ️ Информация о занятиях', callback_data: 'class_info' }],
        ];

        await this.sendMessageWithInlineKeyboard(
          chatId,
          `Здравствуйте, ${clientName}! 👋\n\n` +
            'Вы уже подключены к нашему боту.\n' +
            'Выберите действие:',
          keyboard,
        );
        return;
      }

      // Создаем или обновляем аккаунт без привязки
      await this.getOrCreateTelegramAccount(message.from, chatId, null);

      // Показываем приветствие с inline кнопками для новых пользователей
      const keyboard: TelegramInlineKeyboardButton[][] = [
        [{ text: '📱 Идентифицироваться по номеру', callback_data: 'start_identification' }],
        [{ text: '💬 Задать вопрос', callback_data: 'ask_question' }],
      ];

      await this.sendMessageWithInlineKeyboard(
        chatId,
        'Здравствуйте! 👋\n\n' +
          'Добро пожаловать в артсвао.ру.\n' +
          'Выберите действие:',
        keyboard,
      );

      // Создаем диалог
      const telegramAccount = await this.prisma.telegramAccount.findUnique({
        where: { telegramUserId: BigInt(telegramUserId) },
      });
      if (telegramAccount) {
        await this.getOrCreateConversation(telegramAccount.id, null);
      }
    }
  }

  /**
   * Обработка команды /cancel (аварийный выход из состояния)
   */
  private async handleCancelCommand(message: TelegramMessage): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    const telegramAccount = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
    });

    if (!telegramAccount) {
      await this.sendMessage(chatId, 'Произошла ошибка. Попробуйте /start');
      return;
    }

    // Если пользователь застрял в CHOOSING_FROM_MULTIPLE или WAITING_FOR_PHONE
    if (telegramAccount.state === 'CHOOSING_FROM_MULTIPLE' || telegramAccount.state === 'WAITING_FOR_PHONE') {
      await this.prisma.telegramAccount.update({
        where: { id: telegramAccount.id },
        data: { state: telegramAccount.clientId ? 'IDENTIFIED' : 'GUEST' },
      });

      await this.sendMessage(
        chatId,
        '✅ Действие отменено.\n\n' +
          'Вы можете написать нам сообщение или задать вопрос.',
        { remove_keyboard: true },
      );
      this.logger.log(`User ${telegramUserId} canceled from state ${telegramAccount.state}`);
    } else {
      await this.sendMessage(
        chatId,
        'Нечего отменять. Просто напишите сообщение или задайте вопрос.',
      );
    }
  }

  /**
   * Обработка команды /stop_notifications
   */
  private async handleStopNotifications(message: TelegramMessage): Promise<void> {
    const telegramUserId = message.from.id;

    // Используем update с unique where (telegramUserId имеет unique индекс)
    await this.prisma.telegramAccount.update({
      where: { telegramUserId: BigInt(telegramUserId) },
      data: { isNotificationsEnabled: false },
    });

    await this.sendMessage(
      message.chat.id,
      'Уведомления отключены. ✅\n\n' +
        'Вы всегда можете включить их снова командой /start_notifications',
    );
  }

  /**
   * Обработка команды /start_notifications
   */
  private async handleStartNotifications(message: TelegramMessage): Promise<void> {
    const telegramUserId = message.from.id;

    // Используем update с unique where (telegramUserId имеет unique индекс)
    await this.prisma.telegramAccount.update({
      where: { telegramUserId: BigInt(telegramUserId) },
      data: { isNotificationsEnabled: true },
    });

    await this.sendMessage(
      message.chat.id,
      'Уведомления включены. ✅\n\n' + 'Теперь вы будете получать важные обновления от нас.',
    );
  }

  /**
   * Обработка контакта (номер телефона)
   */
  private async handleContact(message: TelegramMessage): Promise<void> {
    const contact = message.contact;
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    if (!contact || !contact.phone_number) {
      await this.sendMessage(
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
      await this.sendMessage(
        chatId,
        'Неверный формат телефона. Пожалуйста, отправьте российский номер телефона.',
      );
      return;
    }

    this.logger.log(
      `Processing contact from user ${telegramUserId}, phone: ${normalizedPhone}`,
    );

    // Ищем клиентов по номеру телефона
    const clients = await this.prisma.client.findMany({
      where: {
        OR: [{ phone: normalizedPhone }, { phoneAdditional: normalizedPhone }],
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

    this.logger.log(`Found ${clients.length} clients for phone ${normalizedPhone}`);

    if (clients.length === 0) {
      // Клиент не найден
      await this.handlePhoneNotFound(chatId, telegramUserId, normalizedPhone);
      return;
    }

    if (clients.length === 1) {
      // Найден один клиент - автоматическая привязка
      await this.linkTelegramToClient(telegramUserId, chatId, clients[0].id);
      return;
    }

    // Найдено несколько клиентов - показываем выбор
    await this.showClientSelection(chatId, telegramUserId, clients);
  }

  /**
   * Обработка случая, когда телефон не найден в базе
   */
  private async handlePhoneNotFound(
    chatId: number,
    telegramUserId: number,
    phone: string,
  ): Promise<void> {
    // Используем update с unique where (telegramUserId имеет unique индекс)
    await this.prisma.telegramAccount.update({
      where: { telegramUserId: BigInt(telegramUserId) },
      data: { state: 'GUEST' },
    });

    await this.sendMessage(
      chatId,
      '❌ К сожалению, мы не нашли ваш номер телефона.\n\n' +
        'Вы можете:\n' +
        '• Написать нам, и менеджер поможет вам\n' +
        '• Записаться на занятия через наш сайт или позвонить нам',
      { remove_keyboard: true },
    );

    this.logger.log(`Phone ${phone} not found for user ${telegramUserId}, set state to GUEST`);
  }

  /**
   * Показать inline клавиатуру для выбора клиента
   */
  private async showClientSelection(
    chatId: number,
    telegramUserId: number,
    clients: any[],
  ): Promise<void> {
    // Обновляем состояние на CHOOSING_FROM_MULTIPLE
    // Используем update с unique where (telegramUserId имеет unique индекс)
    await this.prisma.telegramAccount.update({
      where: { telegramUserId: BigInt(telegramUserId) },
      data: { state: 'CHOOSING_FROM_MULTIPLE' },
    });

    // Формируем inline кнопки
    const keyboard: TelegramInlineKeyboardButton[][] = clients.map((client) => {
      const fullName = [client.lastName, client.firstName, client.middleName]
        .filter(Boolean)
        .join(' ');

      let displayText = fullName;
      if (client.dateOfBirth) {
        const birthYear = new Date(client.dateOfBirth).getFullYear();
        displayText += ` (${birthYear} г.р.)`;
      }

      return [
        {
          text: displayText,
          callback_data: `select_client_${client.id}`,
        },
      ];
    });

    // Добавляем кнопку "Это не я"
    keyboard.push([
      {
        text: '❌ Нет моего имени в списке',
        callback_data: 'skip_identification',
      },
    ]);

    await this.sendMessageWithInlineKeyboard(
      chatId,
      `Вот что нам удалось найти. Пожалуйста, выберите нужный контакт:`,
      keyboard,
    );

    this.logger.log(
      `Показан выбор из ${clients.length} клиентов для user ${telegramUserId}`,
    );
  }

  /**
   * Обработка callback query (нажатие на inline кнопки)
   */
  private async handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const data = callbackQuery.data;
    const telegramUserId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;

    if (!chatId) {
      this.logger.warn(`No chat ID in callback query from user ${telegramUserId}`);
      return;
    }

    this.logger.log(`Processing callback query from user ${telegramUserId}, data: ${data}`);

    // Обработка выбора клиента: "select_client_<uuid>"
    if (data?.startsWith('select_client_')) {
      await this.handleClientSelection(callbackQuery);
      return;
    }

    // Обработка отказа от идентификации
    if (data === 'skip_identification') {
      await this.handleSkipIdentification(callbackQuery);
      return;
    }

    // Обработка кнопки "Идентифицироваться по номеру"
    if (data === 'start_identification') {
      await this.answerCallbackQuery(callbackQuery.id);
      await this.offerIdentification(chatId, telegramUserId);
      return;
    }

    // Обработка кнопки "Задать вопрос" или "Написать сообщение"
    if (data === 'ask_question' || data === 'write_message') {
      await this.answerCallbackQuery(callbackQuery.id, 'Напишите ваше сообщение');
      await this.sendMessage(
        chatId,
        'Напишите ваш вопрос или сообщение, и мы ответим вам как можно скорее! 💬',
      );
      return;
    }

    // Обработка кнопки "Информация о занятиях"
    if (data === 'class_info') {
      await this.answerCallbackQuery(callbackQuery.id);
      await this.sendMessage(
        chatId,
        'ℹ️ Информацию о ваших занятиях вы можете получить у менеджера.\n' +
          'Просто напишите сообщение, и мы ответим!',
      );
      return;
    }

    this.logger.warn(`Unknown callback data: ${data}`);
    await this.answerCallbackQuery(callbackQuery.id, 'Неизвестная команда');
  }

  /**
   * Обработка выбора клиента из списка
   */
  private async handleClientSelection(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const clientId = callbackQuery.data.replace('select_client_', '');
    const telegramUserId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId) {
      return;
    }

    // Отвечаем на callback
    await this.answerCallbackQuery(callbackQuery.id, 'Отлично!');

    // Удаляем inline-клавиатуру из сообщения с выбором
    if (messageId) {
      await this.editMessageReplyMarkup(chatId, messageId);
    }

    // Привязываем клиента
    await this.linkTelegramToClient(telegramUserId, chatId, clientId);
  }

  /**
   * Обработка отказа от идентификации
   */
  private async handleSkipIdentification(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const telegramUserId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    if (!chatId) {
      return;
    }

    await this.answerCallbackQuery(callbackQuery.id);

    // Удаляем inline-клавиатуру из сообщения с выбором
    if (messageId) {
      await this.editMessageReplyMarkup(chatId, messageId);
    }

    // Устанавливаем состояние GUEST
    // Используем update с unique where (telegramUserId имеет unique индекс)
    await this.prisma.telegramAccount.update({
      where: { telegramUserId: BigInt(telegramUserId) },
      data: { state: 'GUEST' },
    });

    await this.sendMessage(
      chatId,
      'Хорошо! Вы можете продолжить общение с нашими менеджерами.\n' +
        'Если хотите получать уведомления, сообщите менеджеру ваши данные.',
      { remove_keyboard: true },
    );

    this.logger.log(`User ${telegramUserId} skipped identification, set state to GUEST`);
  }

  /**
   * Предложить идентификацию новому пользователю
   */
  private async offerIdentification(chatId: number, telegramUserId: number): Promise<void> {
    const keyboard: TelegramReplyKeyboardMarkup = {
      keyboard: [
        [
          {
            text: '📱 Поделиться номером телефона',
            request_contact: true,
          },
        ],
        [
          {
            text: '❌ Продолжить без идентификации',
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    await this.sendMessage(
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
   * Обработка текстового сообщения
   */
  private async handleTextMessage(message: TelegramMessage, textOverride?: string): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    // Получаем или создаем TelegramAccount
    const telegramAccount = await this.getOrCreateTelegramAccount(message.from, chatId);

    // Обработка кнопки "Продолжить без идентификации"
    if (
      telegramAccount.state === 'WAITING_FOR_PHONE' &&
      message.text === '❌ Продолжить без идентификации'
    ) {
      // Используем update с unique where (telegramUserId имеет unique индекс)
      await this.prisma.telegramAccount.update({
        where: { telegramUserId: BigInt(telegramUserId) },
        data: { state: 'GUEST' },
      });
      await this.sendMessage(
        chatId,
        'Хорошо! Вы можете продолжить общение с нашими менеджерами.',
        { remove_keyboard: true },
      );
      return; // Не сохраняем это сообщение в БД
    }

    // Если пользователь застрял в CHOOSING_FROM_MULTIPLE - напоминаем о выборе
    if (telegramAccount.state === 'CHOOSING_FROM_MULTIPLE') {
      const messageText = message.text.toLowerCase().trim();

      // Аварийный выход по текстовым командам
      if (messageText === 'отмена' || messageText === 'отменить' || messageText === 'cancel') {
        await this.prisma.telegramAccount.update({
          where: { id: telegramAccount.id },
          data: { state: telegramAccount.clientId ? 'IDENTIFIED' : 'GUEST' },
        });
        await this.sendMessage(
          chatId,
          '✅ Действие отменено. Вы можете написать нам сообщение или задать вопрос.',
          { remove_keyboard: true },
        );
        this.logger.log(`User ${telegramUserId} canceled from CHOOSING_FROM_MULTIPLE via text`);
        return;
      }

      await this.sendMessage(
        chatId,
        '⚠️ Пожалуйста, выберите нужный контакт из списка выше, нажав на соответствующую кнопку.\n\n' +
          'Если вашего имени нет в списке, нажмите "❌ Нет моего имени в списке".\n\n' +
          'Для отмены введите "отмена" или /cancel',
      );
      return; // Не сохраняем это сообщение в БД
    }

    // Если это NEW_USER - предлагаем идентификацию
    if (telegramAccount.state === 'NEW_USER') {
      await this.offerIdentification(chatId, telegramUserId);
      // Обновляем состояние на WAITING_FOR_PHONE
      // Используем update с unique where (telegramUserId имеет unique индекс)
      await this.prisma.telegramAccount.update({
        where: { telegramUserId: BigInt(telegramUserId) },
        data: { state: 'WAITING_FOR_PHONE' },
      });
    }

    // Получаем или создаем Conversation
    const conversation = await this.getOrCreateConversation(
      telegramAccount.id,
      telegramAccount.clientId,
    );

    // Помечаем все непрочитанные исходящие сообщения как прочитанные
    // (если клиент пишет, значит он видит чат и прочитал наши сообщения)
    await this.prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        isReadByClient: false,
      },
      data: {
        isReadByClient: true,
      },
    });

    // Сохраняем сообщение
    const createdMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        senderType: 'CLIENT',
        text: textOverride || message.text,
        category: 'CHAT',
        isReadByClient: true,
        isReadByManager: false,
      },
    });

    // Обновляем время последнего сообщения в диалоге
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Message saved to conversation ${conversation.id}`);

    await this.notifyNewInbound(conversation.id, createdMessage.createdAt);
  }

  /**
   * Обработка фото
   */
  private async handlePhoto(message: TelegramMessage): Promise<void> {
    if (!message.photo || message.photo.length === 0) {
      this.logger.warn('Received photo message without photo array');
      return;
    }

    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    // Получаем или создаем TelegramAccount
    const telegramAccount = await this.getOrCreateTelegramAccount(message.from, chatId);

    // Получаем или создаем Conversation
    const conversation = await this.getOrCreateConversation(
      telegramAccount.id,
      telegramAccount.clientId,
    );

    // Помечаем все непрочитанные исходящие сообщения как прочитанные
    await this.prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        isReadByClient: false,
      },
      data: {
        isReadByClient: true,
      },
    });

    try {
      // Берем самое большое фото (последнее в массиве)
      const largestPhoto = message.photo[message.photo.length - 1];

      // Получаем информацию о файле из Telegram API
      const fileResponse = await this.apiClient.get('/getFile', {
        params: { file_id: largestPhoto.file_id },
      });

      const filePath = fileResponse.data.result.file_path;
      const telegramFileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;

      // Скачиваем файл из Telegram
      const imageResponse = await axios.get(telegramFileUrl, {
        responseType: 'arraybuffer',
      });

      // Подготавливаем файл для загрузки в S3
      const file: Express.Multer.File = {
        buffer: Buffer.from(imageResponse.data),
        originalname: `telegram-photo-${largestPhoto.file_id}.jpg`,
        mimetype: 'image/jpeg',
        size: largestPhoto.file_size || imageResponse.data.length,
      } as Express.Multer.File;

      // Загружаем в S3
      const uploadResult = await this.s3Storage.uploadImage(file, 'telegram-photos');

      // Сохраняем сообщение с метаданными изображения
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
            telegramFileUrl,
          },
          category: 'CHAT',
          isReadByClient: true,
          isReadByManager: false,
        },
      });

      // Обновляем время последнего сообщения
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
      // Fallback: сохраняем как текстовое сообщение
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
  private async handleDocument(message: TelegramMessage): Promise<void> {
    // TODO: Сохранение документа и отображение в чате (расширение)
    await this.handleTextMessage(message, '[Документ отправлен]');
  }

  /**
   * Оповещение фронта о новом входящем сообщении.
   */
  private async notifyNewInbound(conversationId: string, createdAt: Date) {
    this.messagesEventsService.emitNewMessage(conversationId, createdAt);
    const count = await this.countUnread();
    this.messagesEventsService.emitUnreadCount(count);
  }

  /**
   * Подсчет непрочитанных входящих для менеджеров.
   */
  private async countUnread(): Promise<number> {
    return this.prisma.message.count({
      where: {
        direction: 'INBOUND',
        isReadByManager: false,
      },
    });
  }

  /**
   * Получить или создать TelegramAccount
   */
  private async getOrCreateTelegramAccount(
    user: TelegramUser,
    chatId: number,
    clientId?: string | null,
  ) {
    const telegramUserId = BigInt(user.id);

    // Используем upsert для атомарного создания/обновления (защита от race conditions)
    const telegramAccount = await this.prisma.telegramAccount.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        chatId: BigInt(chatId),
        username: user.username || null,
        firstName: user.first_name,
        lastName: user.last_name || null,
        photoUrl: null, // Установим позже асинхронно
        clientId: clientId || null,
        state: clientId ? 'IDENTIFIED' : 'NEW_USER',
      },
      update: {
        chatId: BigInt(chatId),
        username: user.username || null,
        firstName: user.first_name,
        lastName: user.last_name || null,
        // Обновляем clientId только если он явно передан (не undefined)
        ...(clientId !== undefined && { clientId }),
      },
    });

    // Получаем аватар пользователя асинхронно в фоне (не блокируем)
    this.getUserProfilePhoto(user.id)
      .then((photoUrl) => {
        if (photoUrl && photoUrl !== telegramAccount.photoUrl) {
          // Обновляем фото в фоне
          return this.prisma.telegramAccount.update({
            where: { id: telegramAccount.id },
            data: { photoUrl },
          });
        }
      })
      .catch((error) => {
        this.logger.debug(`Failed to update profile photo for user ${user.id}: ${error.message}`);
      });

    this.logger.log(`${telegramAccount.createdAt === telegramAccount.updatedAt ? 'Created' : 'Updated'} TelegramAccount for user ${user.id}`);

    return telegramAccount;
  }

  /**
   * Получить или создать Conversation
   * Для каждого TelegramAccount существует только один Conversation
   */
  private async getOrCreateConversation(channelAccountId: string, clientId?: string | null) {
    // Используем upsert для атомарного создания/обновления (защита от race conditions)
    const conversation = await this.prisma.conversation.upsert({
      where: { channelAccountId },
      create: {
        channelAccountId,
        source: 'TELEGRAM',
        status: 'OPEN',
      },
      update: {
        // Если диалог был закрыт, открываем его заново при новом сообщении
        status: 'OPEN',
      },
    });

    this.logger.log(`${conversation.createdAt === conversation.updatedAt ? 'Created' : 'Ensured open'} Conversation ${conversation.id}`);

    return conversation;
  }

  /**
   * Отправить сообщение в Telegram
   */
  async sendMessage(
    chatId: number | bigint,
    text: string,
    replyMarkup?: TelegramReplyKeyboardMarkup | { remove_keyboard: boolean },
  ): Promise<void> {
    try {
      const data: any = {
        chat_id: Number(chatId),
        text,
      };

      if (replyMarkup) {
        data.reply_markup = replyMarkup;
      }

      await this.apiClient.post('/sendMessage', data);
      this.logger.log(`Message sent to chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send message to chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Отправить изображение в Telegram
   */
  async sendPhoto(
    chatId: number | bigint,
    photoUrl: string,
    caption?: string,
  ): Promise<void> {
    try {
      const data: any = {
        chat_id: Number(chatId),
        photo: photoUrl,
      };

      if (caption) {
        data.caption = caption;
      }

      await this.apiClient.post('/sendPhoto', data);
      this.logger.log(`Photo sent to chat ${chatId}: ${photoUrl}`);
    } catch (error) {
      this.logger.error(`Failed to send photo to chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Отправить сообщение с inline клавиатурой
   */
  private async sendMessageWithInlineKeyboard(
    chatId: number | bigint,
    text: string,
    inlineKeyboard: TelegramInlineKeyboardButton[][],
  ): Promise<void> {
    try {
      const data: any = {
        chat_id: Number(chatId),
        text,
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      };

      await this.apiClient.post('/sendMessage', data);
      this.logger.log(`Message with inline keyboard sent to chat ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send message with inline keyboard to chat ${chatId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Ответить на callback query (убрать "часики" загрузки)
   */
  private async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
  ): Promise<void> {
    try {
      await this.apiClient.post('/answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: text || '',
      });
      this.logger.log(`Answered callback query ${callbackQueryId}`);
    } catch (error) {
      this.logger.error(
        `Failed to answer callback query ${callbackQueryId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Редактировать inline-клавиатуру сообщения (убрать кнопки)
   */
  private async editMessageReplyMarkup(
    chatId: number,
    messageId: number,
  ): Promise<void> {
    try {
      await this.apiClient.post('/editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [],
        },
      });
      this.logger.log(`Edited message ${messageId} in chat ${chatId} - removed inline keyboard`);
    } catch (error) {
      this.logger.error(
        `Failed to edit message ${messageId} in chat ${chatId}: ${error.message}`,
      );
      // Не пробрасываем ошибку дальше, так как это не критично
    }
  }

  /**
   * Привязать Telegram аккаунт к клиенту
   */
  private async linkTelegramToClient(
    telegramUserId: number,
    chatId: number,
    clientId: string,
  ): Promise<void> {
    // Получаем данные клиента
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { firstName: true, lastName: true },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Обновляем TelegramAccount
    // Используем update с unique where (telegramUserId имеет unique индекс)
    await this.prisma.telegramAccount.update({
      where: { telegramUserId: BigInt(telegramUserId) },
      data: {
        clientId,
        state: 'IDENTIFIED',
      },
    });

    // Отправляем подтверждение и скрываем клавиатуру "Поделиться номером"
    const clientName = `${client.firstName} ${client.lastName}`;
    await this.sendMessage(
      chatId,
      `✅ Отлично, ${clientName}!\n\n` +
        'Добро пожаловать в артсвао.ру.\n' +
        'Теперь мы на связи - доступны сообщения и уведомления.',
      { remove_keyboard: true },
    );

    this.logger.log(`Telegram user ${telegramUserId} linked to client ${clientId}`);
  }

  /**
   * Отправить сообщение клиенту по conversation ID
   */
  async sendMessageToConversation(conversationId: string, text: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { telegramAccount: true },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Отправляем сообщение в Telegram
    await this.sendMessage(conversation.telegramAccount.chatId, text);

    // Сохраняем сообщение в БД
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

    // Обновляем время последнего сообщения
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`Message sent to conversation ${conversationId}`);
  }

  /**
   * Настроить webhook
   */
  async setWebhook(url: string): Promise<any> {
    try {
      const response = await this.apiClient.post('/setWebhook', { url });
      this.logger.log(`Webhook set to ${url}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to set webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить информацию о webhook
   */
  async getWebhookInfo(): Promise<any> {
    try {
      const response = await this.apiClient.get('/getWebhookInfo');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get webhook info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удалить webhook
   */
  async deleteWebhook(): Promise<any> {
    try {
      const response = await this.apiClient.post('/deleteWebhook');
      this.logger.log('Webhook deleted');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить URL фото профиля пользователя
   */
  async getUserProfilePhoto(userId: number | bigint): Promise<string | null> {
    try {
      // Получаем список фотографий профиля
      const response = await this.apiClient.get('/getUserProfilePhotos', {
        params: { user_id: userId.toString(), limit: 1 },
      });

      if (!response.data.result?.photos || response.data.result.photos.length === 0) {
        this.logger.debug(`No profile photos found for user ${userId}`);
        return null;
      }

      // Берем первую (самую новую) фотографию
      const photo = response.data.result.photos[0];
      if (!photo || photo.length === 0) {
        return null;
      }

      // Берем самое большое изображение (последний элемент в массиве)
      const fileId = photo[photo.length - 1].file_id;

      // Получаем информацию о файле
      const fileResponse = await this.apiClient.get('/getFile', {
        params: { file_id: fileId },
      });

      if (!fileResponse.data.result?.file_path) {
        return null;
      }

      const filePath = fileResponse.data.result.file_path;
      const photoUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;

      this.logger.debug(`Got profile photo for user ${userId}: ${photoUrl}`);
      return photoUrl;
    } catch (error) {
      this.logger.error(`Failed to get profile photo for user ${userId}: ${error.message}`);
      return null;
    }
  }
}
