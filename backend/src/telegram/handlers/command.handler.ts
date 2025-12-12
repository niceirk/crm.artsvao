import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramState } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { TelegramMessage } from '../interfaces/telegram-api.interface';
import { TelegramApiService } from '../services/telegram-api.service';
import { TelegramStateService } from '../services/telegram-state.service';
import { TelegramKeyboardService } from '../services/telegram-keyboard.service';
import { TelegramIdentificationService } from '../services/telegram-identification.service';
import { TelegramEventRegistrationService } from '../services/telegram-event-registration.service';
import { formatClientName } from '../utils/format.util';

/**
 * Обработчик команд бота (/start, /cancel, /stop_notifications, /start_notifications)
 */
@Injectable()
export class CommandHandler {
  private readonly logger = new Logger(CommandHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: TelegramApiService,
    private readonly stateService: TelegramStateService,
    private readonly keyboardService: TelegramKeyboardService,
    private readonly identificationService: TelegramIdentificationService,
    private readonly eventRegistrationService: TelegramEventRegistrationService,
  ) {}

  /**
   * Обработка команд бота
   */
  async handleCommand(message: TelegramMessage): Promise<void> {
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
        await this.apiService.sendMessage(
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
  private async handleStartCommand(
    message: TelegramMessage,
    args: string[],
  ): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    // Проверяем параметр event_<id> для регистрации на событие
    if (args.length > 0 && args[0].startsWith('event_')) {
      const eventId = args[0].replace('event_', '');
      await this.eventRegistrationService.handleEventRegistrationStart(message, eventId);
      return;
    }

    // Проверяем параметр client_<id> для автопривязки
    let clientId: string | null = null;
    if (args.length > 0 && args[0].startsWith('client_')) {
      clientId = args[0].replace('client_', '');

      if (!isValidUUID(clientId)) {
        this.logger.warn(`Invalid client UUID received: ${clientId}`);
        await this.apiService.sendMessage(
          chatId,
          '❌ Неверная ссылка. Пожалуйста, используйте ссылку, которую вам отправили.',
        );
        return;
      }

      this.logger.log(`Auto-linking user ${telegramUserId} to client ${clientId}`);

      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
          status: true,
        },
      });

      if (!client) {
        this.logger.warn(`Client ${clientId} not found for user ${telegramUserId}`);
        await this.apiService.sendMessage(
          chatId,
          '❌ Клиент не найден. Пожалуйста, свяжитесь с менеджером для получения корректной ссылки.',
        );
        await this.stateService.getOrCreateAccount(message.from, chatId, null);
        return;
      }

      if (client.status === 'INACTIVE') {
        this.logger.warn(
          `Client ${clientId} is INACTIVE, denying access for user ${telegramUserId}`,
        );
        await this.apiService.sendMessage(
          chatId,
          '❌ Ваш аккаунт неактивен. Пожалуйста, свяжитесь с менеджером.',
        );
        return;
      }

      const telegramAccount = await this.stateService.getOrCreateAccount(
        message.from,
        chatId,
        clientId,
      );

      const clientName = formatClientName(
        client.firstName,
        client.lastName,
        client.middleName,
        client.dateOfBirth
      );

      await this.apiService.sendMessage(
        chatId,
        `Здравствуйте, ${clientName}! 👋\n\n` +
          'Добро пожаловать в артсвао.ру.\n' +
          'Теперь мы на связи - доступны сообщения и уведомления.',
      );

      await this.stateService.updateStateById(telegramAccount.id, TelegramState.IDENTIFIED);

      await this.stateService.getOrCreateConversation(telegramAccount.id, clientId);
    } else {
      // Новый пользователь без автопривязки
      const existingAccount = await this.prisma.telegramAccount.findUnique({
        where: { telegramUserId: BigInt(telegramUserId) },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              middleName: true,
              dateOfBirth: true,
            },
          },
        },
      });

      if (
        existingAccount &&
        existingAccount.state === TelegramState.IDENTIFIED &&
        existingAccount.client
      ) {
        const clientName = formatClientName(
          existingAccount.client.firstName,
          existingAccount.client.lastName,
          existingAccount.client.middleName,
          existingAccount.client.dateOfBirth
        );

        const keyboard = this.keyboardService.buildIdentifiedUserKeyboard();

        await this.apiService.sendMessageWithInlineKeyboard(
          chatId,
          `Здравствуйте, ${clientName}! 👋\n\n` +
            'Вы уже подключены к нашему боту.\n' +
            'Выберите действие:',
          keyboard,
        );
        return;
      }

      await this.stateService.getOrCreateAccount(message.from, chatId, null);

      const keyboard = this.keyboardService.buildWelcomeKeyboard();

      await this.apiService.sendMessageWithInlineKeyboard(
        chatId,
        'Здравствуйте! 👋\n\n' +
          'Добро пожаловать в артсвао.ру.\n' +
          'Выберите действие:',
        keyboard,
      );

      const telegramAccount = await this.prisma.telegramAccount.findUnique({
        where: { telegramUserId: BigInt(telegramUserId) },
      });
      if (telegramAccount) {
        await this.stateService.getOrCreateConversation(telegramAccount.id, null);
      }
    }
  }

  /**
   * Обработка команды /cancel
   */
  private async handleCancelCommand(message: TelegramMessage): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    const telegramAccount = await this.stateService.getAccount(BigInt(telegramUserId));

    if (!telegramAccount) {
      await this.apiService.sendMessage(chatId, 'Произошла ошибка. Попробуйте /start');
      return;
    }

    if (
      telegramAccount.state === TelegramState.CHOOSING_FROM_MULTIPLE ||
      telegramAccount.state === TelegramState.WAITING_FOR_PHONE
    ) {
      await this.stateService.updateStateById(
        telegramAccount.id,
        telegramAccount.clientId ? TelegramState.IDENTIFIED : TelegramState.GUEST,
      );

      await this.apiService.sendMessage(
        chatId,
        '✅ Действие отменено.\n\n' +
          'Вы можете написать нам сообщение или задать вопрос.',
        { remove_keyboard: true },
      );
      this.logger.log(`User ${telegramUserId} canceled from state ${telegramAccount.state}`);
    } else {
      await this.apiService.sendMessage(
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

    await this.stateService.updateNotifications(BigInt(telegramUserId), false);

    await this.apiService.sendMessage(
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

    await this.stateService.updateNotifications(BigInt(telegramUserId), true);

    await this.apiService.sendMessage(
      message.chat.id,
      'Уведомления включены. ✅\n\n' + 'Теперь вы будете получать важные обновления от нас.',
    );
  }
}
