import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../../telegram/telegram.service';
import {
  INotificationChannel,
  RenderedContent,
  ChannelResult,
  RateLimitConfig,
} from '../interfaces/channel.interface';

@Injectable()
export class TelegramChannelAdapter implements INotificationChannel {
  private readonly logger = new Logger(TelegramChannelAdapter.name);
  readonly name = 'TELEGRAM';

  constructor(private readonly telegramService: TelegramService) {}

  async send(
    recipientAddress: string,
    content: RenderedContent,
  ): Promise<ChannelResult> {
    try {
      const chatId = BigInt(recipientAddress);
      await this.telegramService.sendMessage(chatId, content.body);

      this.logger.log(`Telegram message sent to chat ${recipientAddress}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram message to ${recipientAddress}: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryable(error),
      };
    }
  }

  validateAddress(address: string): boolean {
    return /^\d+$/.test(address);
  }

  getRateLimitConfig(): RateLimitConfig {
    return {
      maxPerSecond: 30,
      maxPerHour: null,
      maxPerDay: null,
    };
  }

  private isRetryable(error: any): boolean {
    // Telegram ошибки, которые можно повторить
    const statusCode = error.response?.status;

    // 429 - rate limit, 5xx - серверные ошибки
    if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
      return true;
    }

    // Временные сетевые ошибки
    const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'ENOTFOUND'];
    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // Telegram API ошибки которые нельзя повторять (пользователь заблокировал бота и т.д.)
    const nonRetryableDescriptions = [
      'bot was blocked',
      'user is deactivated',
      'chat not found',
      'PEER_ID_INVALID',
    ];

    const errorMessage = error.response?.data?.description || error.message || '';
    if (
      nonRetryableDescriptions.some((desc) =>
        errorMessage.toLowerCase().includes(desc.toLowerCase()),
      )
    ) {
      return false;
    }

    return false;
  }
}
