import { Injectable, Logger } from '@nestjs/common';
import { TelegramState } from '@prisma/client';
import { normalizePhone } from '../common/utils/phone.util';
import {
  TelegramUpdate,
  TelegramReplyKeyboardMarkup,
} from './interfaces/telegram-api.interface';
import { ITelegramService, SendMessageOptions } from './interfaces/telegram-service.interface';
import { TelegramApiService } from './services/telegram-api.service';
import { TelegramStateService } from './services/telegram-state.service';
import { TelegramIdentificationService } from './services/telegram-identification.service';
import { TelegramMessagingService } from './services/telegram-messaging.service';
import { TelegramEventRegistrationService } from './services/telegram-event-registration.service';
import { CommandHandler } from './handlers/command.handler';
import { CallbackQueryHandler } from './handlers/callback-query.handler';

/**
 * Facade сервис для Telegram бота
 * Делегирует в специализированные сервисы, сохраняя публичный API
 */
@Injectable()
export class TelegramService implements ITelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly apiService: TelegramApiService,
    private readonly stateService: TelegramStateService,
    private readonly identificationService: TelegramIdentificationService,
    private readonly messagingService: TelegramMessagingService,
    private readonly eventRegistrationService: TelegramEventRegistrationService,
    private readonly commandHandler: CommandHandler,
    private readonly callbackQueryHandler: CallbackQueryHandler,
  ) {}

  /**
   * Обработка входящего webhook от Telegram
   */
  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Обработка callback query
      if (update.callback_query) {
        await this.callbackQueryHandler.handleCallbackQuery(update.callback_query);
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
        await this.commandHandler.handleCommand(message);
        return;
      }

      // Получаем account для проверки состояния
      const telegramAccount = await this.stateService.getAccount(
        BigInt(message.from.id),
      );

      // Проверяем состояние регистрации на событие
      if (telegramAccount && this.stateService.isEventRegistrationState(telegramAccount.state)) {
        // Обработка контакта при регистрации на событие
        if (message.contact && telegramAccount.state === TelegramState.EVENT_REGISTRATION_PHONE) {
          try {
            const normalizedPhone = normalizePhone(message.contact.phone_number);
            await this.eventRegistrationService.handleEventRegistrationContact(
              message,
              telegramAccount,
              normalizedPhone,
            );
          } catch (error) {
            await this.apiService.sendMessage(
              message.chat.id,
              'Неверный формат телефона. Пожалуйста, отправьте российский номер телефона.',
            );
          }
          return;
        }

        // Обработка текста при регистрации на событие
        if (message.text) {
          await this.eventRegistrationService.handleEventRegistrationTextInput(
            message,
            telegramAccount,
          );
          return;
        }
      }

      // Обработка контакта (идентификация)
      if (message.contact) {
        await this.identificationService.handleContact(message);
        return;
      }

      // Обработка обычного текстового сообщения
      if (message.text) {
        await this.messagingService.handleTextMessage(message);
        return;
      }

      // Обработка фото
      if (message.photo) {
        await this.messagingService.handlePhoto(message);
        return;
      }

      // Обработка документов
      if (message.document) {
        await this.messagingService.handleDocument(message);
        return;
      }

      this.logger.warn(`Unsupported message type from user ${message.from.id}`);
    } catch (error) {
      this.logger.error(`Error processing update: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // Публичный API (backward compatibility)
  // ============================================

  /**
   * Отправить текстовое сообщение
   */
  async sendMessage(
    chatId: number | bigint,
    text: string,
    options?: SendMessageOptions | TelegramReplyKeyboardMarkup | { remove_keyboard: boolean },
  ): Promise<void> {
    return this.apiService.sendMessage(chatId, text, options);
  }

  /**
   * Отправить фото
   */
  async sendPhoto(
    chatId: number | bigint,
    photoUrl: string,
    caption?: string,
  ): Promise<void> {
    return this.apiService.sendPhoto(chatId, photoUrl, caption);
  }

  /**
   * Отправить сообщение в диалог по ID
   */
  async sendMessageToConversation(
    conversationId: string,
    text: string,
  ): Promise<void> {
    return this.messagingService.sendMessageToConversation(conversationId, text);
  }

  /**
   * Настроить webhook
   */
  async setWebhook(url: string): Promise<any> {
    return this.apiService.setWebhook(url);
  }

  /**
   * Получить информацию о webhook
   */
  async getWebhookInfo(): Promise<any> {
    return this.apiService.getWebhookInfo();
  }

  /**
   * Удалить webhook
   */
  async deleteWebhook(): Promise<any> {
    return this.apiService.deleteWebhook();
  }

  /**
   * Получить URL фото профиля пользователя
   */
  async getUserProfilePhoto(userId: number | bigint): Promise<string | null> {
    return this.apiService.getUserProfilePhoto(userId);
  }
}
