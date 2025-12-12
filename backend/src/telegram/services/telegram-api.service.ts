import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  TelegramReplyKeyboardMarkup,
  TelegramInlineKeyboardButton,
} from '../interfaces/telegram-api.interface';
import { SendMessageOptions } from '../interfaces/telegram-service.interface';

/**
 * Низкоуровневый сервис для работы с Telegram Bot API
 * Отвечает за все HTTP вызовы к API Telegram
 */
@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly botToken: string;
  private readonly apiClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
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
   * Получить токен бота (для формирования URL файлов)
   */
  getBotToken(): string {
    return this.botToken;
  }

  /**
   * Получить axios клиент для расширенных операций
   */
  getApiClient(): AxiosInstance {
    return this.apiClient;
  }

  /**
   * Отправить текстовое сообщение
   */
  async sendMessage(
    chatId: number | bigint,
    text: string,
    options?: SendMessageOptions | TelegramReplyKeyboardMarkup | { remove_keyboard: boolean },
  ): Promise<void> {
    try {
      const data: any = {
        chat_id: Number(chatId),
        text,
      };

      if (options) {
        // Проверяем тип options
        if ('parse_mode' in options) {
          data.parse_mode = options.parse_mode;
        }
        if ('reply_markup' in options) {
          data.reply_markup = options.reply_markup;
        } else if ('remove_keyboard' in options) {
          data.reply_markup = options;
        } else if ('keyboard' in options) {
          // TelegramReplyKeyboardMarkup
          data.reply_markup = options;
        }
      }

      await this.apiClient.post('/sendMessage', data);
      this.logger.log(`Message sent to chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send message to chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Отправить изображение
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
  async sendMessageWithInlineKeyboard(
    chatId: number | bigint,
    text: string,
    inlineKeyboard: TelegramInlineKeyboardButton[][],
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2',
  ): Promise<void> {
    try {
      const data: any = {
        chat_id: Number(chatId),
        text,
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      };

      if (parseMode) {
        data.parse_mode = parseMode;
      }

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
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
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
  async editMessageReplyMarkup(chatId: number, messageId: number): Promise<void> {
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

  /**
   * Получить информацию о файле по file_id
   */
  async getFileInfo(fileId: string): Promise<{ filePath: string; fileUrl: string } | null> {
    try {
      const response = await this.apiClient.get('/getFile', {
        params: { file_id: fileId },
      });

      const filePath = response.data.result?.file_path;
      if (!filePath) {
        return null;
      }

      return {
        filePath,
        fileUrl: `https://api.telegram.org/file/bot${this.botToken}/${filePath}`,
      };
    } catch (error) {
      this.logger.error(`Failed to get file info for ${fileId}: ${error.message}`);
      return null;
    }
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
}
