import {
  TelegramReplyKeyboardMarkup,
  TelegramUpdate,
} from './telegram-api.interface';

/**
 * Опции отправки сообщения
 */
export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: TelegramReplyKeyboardMarkup | { remove_keyboard: boolean };
  remove_keyboard?: boolean;
}

/**
 * Публичный интерфейс TelegramService для внешних модулей
 */
export interface ITelegramService {
  /**
   * Отправить текстовое сообщение
   */
  sendMessage(
    chatId: number | bigint,
    text: string,
    options?: SendMessageOptions,
  ): Promise<void>;

  /**
   * Отправить фото
   */
  sendPhoto(
    chatId: number | bigint,
    photoUrl: string,
    caption?: string,
  ): Promise<void>;

  /**
   * Отправить сообщение в диалог по ID
   */
  sendMessageToConversation(
    conversationId: string,
    text: string,
  ): Promise<void>;

  /**
   * Обработать входящий webhook update
   */
  processUpdate(update: TelegramUpdate): Promise<void>;

  /**
   * Настроить webhook
   */
  setWebhook(url: string): Promise<any>;

  /**
   * Получить информацию о webhook
   */
  getWebhookInfo(): Promise<any>;

  /**
   * Удалить webhook
   */
  deleteWebhook(): Promise<any>;
}

/**
 * Результат загрузки изображения в S3
 */
export interface ImageUploadResult {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
}
