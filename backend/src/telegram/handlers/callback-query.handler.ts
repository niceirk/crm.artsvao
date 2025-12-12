import { Injectable, Logger } from '@nestjs/common';
import { TelegramCallbackQuery } from '../interfaces/telegram-api.interface';
import { TelegramApiService } from '../services/telegram-api.service';
import { TelegramIdentificationService } from '../services/telegram-identification.service';
import { TelegramEventRegistrationService } from '../services/telegram-event-registration.service';

/**
 * Обработчик callback query (нажатие на inline кнопки)
 */
@Injectable()
export class CallbackQueryHandler {
  private readonly logger = new Logger(CallbackQueryHandler.name);

  constructor(
    private readonly apiService: TelegramApiService,
    private readonly identificationService: TelegramIdentificationService,
    private readonly eventRegistrationService: TelegramEventRegistrationService,
  ) {}

  /**
   * Обработка callback query
   */
  async handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
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
      await this.identificationService.handleClientSelection(callbackQuery);
      return;
    }

    // Обработка отказа от идентификации
    if (data === 'skip_identification') {
      await this.identificationService.handleSkipIdentification(callbackQuery);
      return;
    }

    // Обработка кнопки "Идентифицироваться по номеру"
    if (data === 'start_identification') {
      await this.apiService.answerCallbackQuery(callbackQuery.id);
      await this.identificationService.offerIdentification(chatId, telegramUserId);
      return;
    }

    // Обработка кнопки "Задать вопрос" или "Написать сообщение"
    if (data === 'ask_question' || data === 'write_message') {
      await this.apiService.answerCallbackQuery(callbackQuery.id, 'Напишите ваше сообщение');
      await this.apiService.sendMessage(
        chatId,
        'Напишите ваш вопрос или сообщение, и мы ответим вам как можно скорее! 💬',
      );
      return;
    }

    // Обработка кнопки "Информация о занятиях"
    if (data === 'class_info') {
      await this.apiService.answerCallbackQuery(callbackQuery.id);
      await this.apiService.sendMessage(
        chatId,
        'ℹ️ Информацию о ваших занятиях вы можете получить у менеджера.\n' +
          'Просто напишите сообщение, и мы ответим!',
      );
      return;
    }

    // ============================================
    // Обработка регистрации на мероприятие
    // ============================================

    // Начать регистрацию на событие
    if (data?.startsWith('register_event_')) {
      const eventId = data.replace('register_event_', '');
      await this.apiService.answerCallbackQuery(callbackQuery.id);
      await this.eventRegistrationService.startEventRegistrationFlow(
        chatId,
        callbackQuery.from.id,
        eventId,
      );
      return;
    }

    // Выбор участника для регистрации на событие (sel_part_<clientId>)
    if (data?.startsWith('sel_part_')) {
      await this.eventRegistrationService.handleEventParticipantSelection(callbackQuery);
      return;
    }

    // Регистрация нового участника на событие
    if (data === 'new_participant') {
      await this.apiService.answerCallbackQuery(callbackQuery.id);
      await this.eventRegistrationService.startNewClientFlowFromContext(
        chatId,
        callbackQuery.from.id,
      );
      return;
    }

    // Пропустить email при регистрации
    if (data === 'skip_email') {
      await this.apiService.answerCallbackQuery(callbackQuery.id);
      await this.eventRegistrationService.handleSkipEmail(chatId, callbackQuery.from.id);
      return;
    }

    // Отмена регистрации на событие
    if (data === 'cancel_event_reg') {
      await this.apiService.answerCallbackQuery(callbackQuery.id);
      await this.eventRegistrationService.cancelEventRegistration(
        chatId,
        callbackQuery.from.id,
      );
      return;
    }

    this.logger.warn(`Unknown callback data: ${data}`);
    await this.apiService.answerCallbackQuery(callbackQuery.id, 'Неизвестная команда');
  }
}
