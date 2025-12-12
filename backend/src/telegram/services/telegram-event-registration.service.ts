import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventParticipantsService } from '../../event-participants/event-participants.service';
import {
  TelegramState,
  CalendarEventStatus,
  ClientStatus,
  Prisma,
  EventRegistrationSource,
} from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { normalizePhone } from '../../common/utils/phone.util';
import { TelegramMessage, TelegramCallbackQuery } from '../interfaces/telegram-api.interface';
import {
  EventRegistrationContext,
  ParticipantOption,
} from '../interfaces/state-context.interface';
import { TelegramApiService } from './telegram-api.service';
import { TelegramStateService } from './telegram-state.service';
import { TelegramKeyboardService } from './telegram-keyboard.service';

/**
 * Сервис регистрации на мероприятия через Telegram
 * Реализует multi-step flow регистрации
 */
@Injectable()
export class TelegramEventRegistrationService {
  private readonly logger = new Logger(TelegramEventRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: TelegramApiService,
    private readonly stateService: TelegramStateService,
    private readonly keyboardService: TelegramKeyboardService,
    @Inject(forwardRef(() => EventParticipantsService))
    private readonly eventParticipantsService: EventParticipantsService,
  ) {}

  /**
   * Обработка deep link /start event_<eventId>
   */
  async handleEventRegistrationStart(
    message: TelegramMessage,
    eventId: string,
  ): Promise<void> {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    if (!isValidUUID(eventId)) {
      await this.apiService.sendMessage(chatId, '❌ Неверная ссылка на мероприятие.');
      return;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
        maxCapacity: true,
        status: true,
        photoUrl: true,
        room: { select: { name: true } },
      },
    });

    if (!event) {
      await this.apiService.sendMessage(chatId, '❌ Мероприятие не найдено.');
      return;
    }

    if (event.status === CalendarEventStatus.CANCELLED) {
      await this.apiService.sendMessage(chatId, '❌ Это мероприятие было отменено.');
      return;
    }

    if (event.status === CalendarEventStatus.COMPLETED) {
      await this.apiService.sendMessage(chatId, '❌ Это мероприятие уже завершилось.');
      return;
    }

    const availability = await this.eventParticipantsService.checkAvailability(eventId);

    await this.stateService.getOrCreateAccount(message.from, chatId);

    const dateStr = this.keyboardService.formatDate(event.date);
    const startTimeStr = this.keyboardService.formatTime(event.startTime);
    const endTimeStr = this.keyboardService.formatTime(event.endTime);

    let eventMessage = `🎭 *${this.keyboardService.escapeMarkdown(event.name)}*\n\n`;
    eventMessage += `📅 ${dateStr}\n`;
    eventMessage += `⏰ ${startTimeStr} - ${endTimeStr}\n`;
    eventMessage += `📍 ${this.keyboardService.escapeMarkdown(event.room?.name || 'Не указано')}\n`;

    if (availability.hasLimit) {
      eventMessage += `👥 Свободных мест: ${availability.available}\n`;
    }

    if (availability.hasLimit && availability.available !== null && availability.available <= 0) {
      eventMessage += '\n⚠️ *К сожалению, все места заняты.*';
      await this.apiService.sendMessage(chatId, eventMessage, { parse_mode: 'Markdown' } as any);
      return;
    }

    const keyboard = this.keyboardService.buildEventRegistrationKeyboard(eventId);
    await this.apiService.sendMessageWithInlineKeyboard(chatId, eventMessage, keyboard);
  }

  /**
   * Начало flow регистрации на событие
   */
  async startEventRegistrationFlow(
    chatId: number,
    telegramUserId: number,
    eventId: string,
  ): Promise<void> {
    const telegramAccount = await this.stateService.getAccountWithClient(
      BigInt(telegramUserId),
    );

    if (!telegramAccount) {
      await this.apiService.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте /start');
      return;
    }

    if (telegramAccount.client) {
      await this.showEventParticipantSelection(
        chatId,
        telegramUserId,
        telegramAccount.client,
        eventId,
      );
      return;
    }

    await this.requestPhoneForEventRegistration(chatId, telegramUserId, eventId);
  }

  /**
   * Показать выбор участника для регистрации
   */
  private async showEventParticipantSelection(
    chatId: number,
    telegramUserId: number,
    client: any,
    eventId: string,
  ): Promise<void> {
    const context: EventRegistrationContext = { eventId, step: 'select' };

    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.EVENT_CHOOSING_CLIENT,
      context,
    );

    const participants: ParticipantOption[] = [];

    const clientName = [client.lastName, client.firstName, client.middleName]
      .filter(Boolean)
      .join(' ');
    const clientBirthYear = client.dateOfBirth
      ? new Date(client.dateOfBirth).getFullYear()
      : undefined;

    participants.push({
      id: client.id,
      name: clientName,
      birthYear: clientBirthYear,
      label: 'вы',
    });

    if (client.relations && client.relations.length > 0) {
      for (const relation of client.relations) {
        const related = relation.relatedClient;
        if (related && related.status !== ClientStatus.INACTIVE) {
          const relatedName = [related.lastName, related.firstName, related.middleName]
            .filter(Boolean)
            .join(' ');
          const relatedBirthYear = related.dateOfBirth
            ? new Date(related.dateOfBirth).getFullYear()
            : undefined;

          let relationLabel = '';
          switch (relation.relationType) {
            case 'PARENT':
              relationLabel = 'родитель';
              break;
            case 'CHILD':
              relationLabel = 'ребенок';
              break;
            case 'SPOUSE':
              relationLabel = 'супруг(а)';
              break;
            case 'SIBLING':
              relationLabel = 'брат/сестра';
              break;
            default:
              relationLabel = 'связан';
          }

          participants.push({
            id: related.id,
            name: relatedName,
            birthYear: relatedBirthYear,
            label: relationLabel,
          });
        }
      }
    }

    const keyboard = this.keyboardService.buildEventParticipantKeyboard(participants);

    await this.apiService.sendMessageWithInlineKeyboard(
      chatId,
      '👤 Кого хотите зарегистрировать на мероприятие?',
      keyboard,
    );
  }

  /**
   * Запросить телефон для регистрации на событие
   */
  private async requestPhoneForEventRegistration(
    chatId: number,
    telegramUserId: number,
    eventId: string,
  ): Promise<void> {
    const context: EventRegistrationContext = { eventId, step: 'phone' };

    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.EVENT_REGISTRATION_PHONE,
      context,
    );

    const keyboard = this.keyboardService.buildEventContactRequestKeyboard();

    await this.apiService.sendMessage(
      chatId,
      'Для регистрации поделитесь, пожалуйста, номером телефона.\n\n' +
        'Если вы уже наш клиент, мы найдем вас по номеру.\n' +
        'Если нет — поможем зарегистрироваться.',
      keyboard,
    );
  }

  /**
   * Обработка контакта при регистрации на событие
   */
  async handleEventRegistrationContact(
    message: TelegramMessage,
    telegramAccount: any,
    normalizedPhone: string,
  ): Promise<void> {
    const chatId = message.chat.id;
    const telegramUserId = message.from.id;

    const context = this.stateService.getRegistrationContext(telegramAccount);
    if (!context || !context.eventId) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Произошла ошибка. Попробуйте начать заново.',
        { remove_keyboard: true },
      );
      return;
    }

    const clients = await this.prisma.client.findMany({
      where: {
        OR: [{ phone: normalizedPhone }, { phoneAdditional: normalizedPhone }],
        status: { not: ClientStatus.INACTIVE },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        dateOfBirth: true,
        relations: {
          include: {
            relatedClient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                dateOfBirth: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (clients.length === 0) {
      await this.startNewClientFlow(chatId, telegramUserId, context.eventId, normalizedPhone);
      return;
    }

    await this.prisma.telegramAccount.update({
      where: { id: telegramAccount.id },
      data: {
        clientId: clients[0].id,
        state: TelegramState.IDENTIFIED,
      },
    });

    await this.apiService.sendMessage(chatId, '✅ Нашли вас!', { remove_keyboard: true });
    await this.showEventParticipantSelection(chatId, telegramUserId, clients[0], context.eventId);
  }

  /**
   * Начать flow создания нового клиента
   */
  async startNewClientFlow(
    chatId: number,
    telegramUserId: number,
    eventId: string,
    phone?: string,
  ): Promise<void> {
    const context: EventRegistrationContext = {
      eventId,
      step: 'name',
      tempClient: phone ? { phone } : {},
    };

    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.EVENT_REGISTRATION_NAME,
      context,
    );

    const keyboard = this.keyboardService.buildCancelKeyboard();

    await this.apiService.sendMessageWithInlineKeyboard(
      chatId,
      '📝 Введите ФИО участника (Фамилия Имя Отчество):',
      keyboard,
    );
  }

  /**
   * Начать flow создания нового клиента из контекста
   */
  async startNewClientFlowFromContext(
    chatId: number,
    telegramUserId: number,
  ): Promise<void> {
    const telegramAccount = await this.stateService.getAccount(BigInt(telegramUserId));

    const context = this.stateService.getRegistrationContext(telegramAccount);
    if (!context?.eventId) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Ошибка: контекст регистрации не найден. Попробуйте заново.',
      );
      return;
    }

    await this.startNewClientFlow(chatId, telegramUserId, context.eventId);
  }

  /**
   * Обработка текстового ввода при регистрации на событие
   */
  async handleEventRegistrationTextInput(
    message: TelegramMessage,
    telegramAccount: any,
  ): Promise<void> {
    const chatId = message.chat.id;
    const telegramUserId = message.from.id;
    const text = message.text?.trim();

    if (text === '❌ Отмена' || text?.toLowerCase() === 'отмена') {
      await this.cancelEventRegistration(chatId, telegramUserId);
      return;
    }

    const context = this.stateService.getRegistrationContext(telegramAccount);
    if (!context || !context.eventId) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Произошла ошибка. Попробуйте начать заново.',
        { remove_keyboard: true },
      );
      await this.stateService.updateStateById(
        telegramAccount.id,
        TelegramState.GUEST,
        null,
      );
      return;
    }

    const state = telegramAccount.state as TelegramState;

    switch (state) {
      case TelegramState.EVENT_REGISTRATION_NAME:
        await this.handleNameInput(chatId, telegramUserId, text, context);
        break;

      case TelegramState.EVENT_REGISTRATION_BIRTHDATE:
        await this.handleBirthdateInput(chatId, telegramUserId, text, context);
        break;

      case TelegramState.EVENT_REGISTRATION_EMAIL:
        await this.handleEmailInput(chatId, telegramUserId, text, context);
        break;

      case TelegramState.EVENT_CHOOSING_CLIENT:
        await this.apiService.sendMessage(
          chatId,
          '⚠️ Пожалуйста, выберите участника из списка выше, нажав на кнопку.',
        );
        break;

      default:
        await this.apiService.sendMessage(chatId, '❌ Неизвестное состояние. Попробуйте /start');
    }
  }

  /**
   * Обработка ввода ФИО
   */
  private async handleNameInput(
    chatId: number,
    telegramUserId: number,
    text: string,
    context: EventRegistrationContext,
  ): Promise<void> {
    if (!text || text.length < 3) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Введите ФИО полностью (Фамилия Имя Отчество)',
      );
      return;
    }

    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      await this.apiService.sendMessage(chatId, '❌ Введите хотя бы фамилию и имя');
      return;
    }

    const [lastName, firstName, ...middleNameParts] = parts;
    const middleName = middleNameParts.join(' ') || undefined;

    context.tempClient = {
      ...context.tempClient,
      firstName,
      lastName,
      middleName,
    };
    context.step = 'birthdate';

    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.EVENT_REGISTRATION_BIRTHDATE,
      context,
    );

    const keyboard = this.keyboardService.buildCancelKeyboard();

    await this.apiService.sendMessageWithInlineKeyboard(
      chatId,
      '📅 Введите дату рождения в формате ДД.ММ.ГГГГ (например, 15.03.1990):',
      keyboard,
    );
  }

  /**
   * Обработка ввода даты рождения
   */
  private async handleBirthdateInput(
    chatId: number,
    telegramUserId: number,
    text: string,
    context: EventRegistrationContext,
  ): Promise<void> {
    const dateRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const match = text.match(dateRegex);

    if (!match) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Неверный формат даты. Введите в формате ДД.ММ.ГГГГ (например, 15.03.1990)',
      );
      return;
    }

    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (
      date.getDate() !== parseInt(day) ||
      date.getMonth() !== parseInt(month) - 1 ||
      date.getFullYear() !== parseInt(year)
    ) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Некорректная дата. Проверьте правильность ввода.',
      );
      return;
    }

    if (date > new Date()) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Дата рождения не может быть в будущем.',
      );
      return;
    }

    context.tempClient = {
      ...context.tempClient,
      dateOfBirth: date.toISOString(),
    };
    context.step = 'email';

    await this.stateService.updateState(
      BigInt(telegramUserId),
      TelegramState.EVENT_REGISTRATION_EMAIL,
      context,
    );

    const keyboard = this.keyboardService.buildSkipEmailKeyboard();

    await this.apiService.sendMessageWithInlineKeyboard(
      chatId,
      '📧 Введите email для получения уведомлений (или нажмите "Пропустить"):',
      keyboard,
    );
  }

  /**
   * Обработка ввода email
   */
  private async handleEmailInput(
    chatId: number,
    telegramUserId: number,
    text: string,
    context: EventRegistrationContext,
  ): Promise<void> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Неверный формат email. Попробуйте еще раз или нажмите "Пропустить".',
      );
      return;
    }

    context.tempClient = {
      ...context.tempClient,
      email: text.toLowerCase(),
    };

    await this.completeNewClientRegistration(chatId, telegramUserId, context);
  }

  /**
   * Пропуск email
   */
  async handleSkipEmail(chatId: number, telegramUserId: number): Promise<void> {
    const telegramAccount = await this.stateService.getAccount(BigInt(telegramUserId));

    const context = this.stateService.getRegistrationContext(telegramAccount);
    if (!context) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Произошла ошибка. Попробуйте начать заново.',
      );
      return;
    }

    await this.completeNewClientRegistration(chatId, telegramUserId, context);
  }

  /**
   * Завершение создания нового клиента и регистрация на событие
   */
  private async completeNewClientRegistration(
    chatId: number,
    telegramUserId: number,
    context: EventRegistrationContext,
  ): Promise<void> {
    const { eventId, tempClient } = context;

    if (!tempClient?.firstName || !tempClient?.lastName) {
      await this.apiService.sendMessage(
        chatId,
        '❌ Недостаточно данных для регистрации. Попробуйте начать заново.',
      );
      return;
    }

    try {
      const newClient = await this.prisma.client.create({
        data: {
          firstName: tempClient.firstName,
          lastName: tempClient.lastName,
          middleName: tempClient.middleName,
          phone: tempClient.phone,
          email: tempClient.email,
          dateOfBirth: tempClient.dateOfBirth ? new Date(tempClient.dateOfBirth) : null,
          status: ClientStatus.ACTIVE,
        },
      });

      this.logger.log(`Created new client ${newClient.id} via Telegram event registration`);

      await this.stateService.updateState(
        BigInt(telegramUserId),
        TelegramState.IDENTIFIED,
        null,
      );

      await this.prisma.telegramAccount.update({
        where: { telegramUserId: BigInt(telegramUserId) },
        data: { clientId: newClient.id },
      });

      await this.registerParticipantAndConfirm(chatId, telegramUserId, eventId, newClient.id);
    } catch (error) {
      this.logger.error(`Failed to create client: ${error.message}`);
      await this.apiService.sendMessage(
        chatId,
        '❌ Произошла ошибка при создании профиля. Попробуйте позже.',
      );
    }
  }

  /**
   * Обработка выбора участника для регистрации
   */
  async handleEventParticipantSelection(
    callbackQuery: TelegramCallbackQuery,
  ): Promise<void> {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const telegramUserId = callbackQuery.from.id;

    if (!chatId || !data) return;

    const clientId = data.replace('sel_part_', '');

    const telegramAccount = await this.stateService.getAccount(BigInt(telegramUserId));

    const context = this.stateService.getRegistrationContext(telegramAccount);
    if (!context?.eventId) {
      await this.apiService.answerCallbackQuery(
        callbackQuery.id,
        'Ошибка: контекст не найден',
      );
      return;
    }

    const eventId = context.eventId;

    await this.apiService.answerCallbackQuery(callbackQuery.id, 'Регистрируем...');

    if (messageId) {
      await this.apiService.editMessageReplyMarkup(chatId, messageId);
    }

    await this.registerParticipantAndConfirm(chatId, telegramUserId, eventId, clientId);
  }

  /**
   * Регистрация участника и отправка подтверждения
   */
  private async registerParticipantAndConfirm(
    chatId: number,
    telegramUserId: number,
    eventId: string,
    clientId: string,
  ): Promise<void> {
    try {
      const participant = await this.eventParticipantsService.registerParticipant({
        eventId,
        clientId,
        source: EventRegistrationSource.TELEGRAM,
        telegramChatId: chatId,
      });

      await this.stateService.updateState(
        BigInt(telegramUserId),
        TelegramState.IDENTIFIED,
        null,
      );

      await this.sendRegistrationConfirmation(chatId, participant);
    } catch (error) {
      this.logger.error(`Failed to register participant: ${error.message}`);

      let errorMessage = '❌ Не удалось зарегистрироваться. ';
      if (error.message.includes('уже зарегистрирован')) {
        errorMessage += 'Этот участник уже зарегистрирован на мероприятие.';
      } else if (error.message.includes('нет свободных мест')) {
        errorMessage += 'К сожалению, все места уже заняты.';
      } else {
        errorMessage += 'Попробуйте позже или свяжитесь с нами.';
      }

      await this.apiService.sendMessage(chatId, errorMessage);
    }
  }

  /**
   * Отправка подтверждения регистрации
   */
  private async sendRegistrationConfirmation(
    chatId: number,
    participant: any,
  ): Promise<void> {
    const event = participant.event;
    const client = participant.client;

    const dateStr = this.keyboardService.formatDate(new Date(event.date));
    const startTimeStr = this.keyboardService.formatTime(new Date(event.startTime));

    const clientName = [client.lastName, client.firstName].filter(Boolean).join(' ');
    const roomName = event.room?.name || 'Не указано';

    let message = '✅ *Регистрация подтверждена!*\n\n';
    message += `🎭 ${this.keyboardService.escapeMarkdown(event.name)}\n`;
    message += `👤 ${this.keyboardService.escapeMarkdown(clientName)}\n`;
    message += `📅 ${dateStr}, ${startTimeStr}\n`;
    message += `📍 ${this.keyboardService.escapeMarkdown(roomName)}\n\n`;
    message += '💡 _Мы напомним о мероприятии за день до начала._';

    await this.apiService.sendMessage(chatId, message, { parse_mode: 'Markdown' } as any);
  }

  /**
   * Отмена регистрации на событие
   */
  async cancelEventRegistration(
    chatId: number,
    telegramUserId: number,
  ): Promise<void> {
    const telegramAccount = await this.stateService.getAccount(BigInt(telegramUserId));

    if (telegramAccount) {
      await this.stateService.updateStateById(
        telegramAccount.id,
        telegramAccount.clientId ? TelegramState.IDENTIFIED : TelegramState.GUEST,
        null,
      );
    }

    await this.apiService.sendMessage(chatId, '❌ Регистрация отменена.', {
      remove_keyboard: true,
    });
  }
}
