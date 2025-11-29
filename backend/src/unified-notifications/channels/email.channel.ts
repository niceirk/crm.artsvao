import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INotificationChannel,
  RenderedContent,
  ChannelResult,
  RateLimitConfig,
} from '../interfaces/channel.interface';

@Injectable()
export class EmailChannelAdapter implements INotificationChannel {
  private readonly logger = new Logger(EmailChannelAdapter.name);
  readonly name = 'EMAIL';

  constructor(
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  async send(
    recipientAddress: string,
    content: RenderedContent,
  ): Promise<ChannelResult> {
    try {
      await this.mailerService.sendMail({
        to: recipientAddress,
        subject: content.subject || 'Уведомление от АртСВАО',
        html: content.format === 'html' ? content.body : undefined,
        text: content.format === 'text' ? content.body : undefined,
      });

      // Логируем в EmailLog для совместимости
      await this.prisma.emailLog.create({
        data: {
          recipient: recipientAddress,
          subject: content.subject || 'Уведомление',
          templateType: 'unified_notification',
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      this.logger.log(`Email sent to ${recipientAddress}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipientAddress}: ${error.message}`,
      );

      // Логируем ошибку
      await this.prisma.emailLog.create({
        data: {
          recipient: recipientAddress,
          subject: content.subject || 'Уведомление',
          templateType: 'unified_notification',
          status: 'FAILED',
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message,
        retryable: this.isRetryable(error),
      };
    }
  }

  validateAddress(address: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
  }

  getRateLimitConfig(): RateLimitConfig {
    return {
      maxPerSecond: 1,
      maxPerHour: 20, // Консервативный лимит
      maxPerDay: 500, // Лимит Яндекс.Почты
    };
  }

  private isRetryable(error: any): boolean {
    // SMTP временные ошибки можно повторить
    const retryableCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ESOCKET',
      'ENOTFOUND',
      'ECONNRESET',
    ];

    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // Временные SMTP ошибки (4xx)
    if (error.responseCode && error.responseCode >= 400 && error.responseCode < 500) {
      // Кроме ошибок типа "mailbox not found" (450, 452)
      if (error.responseCode !== 450 && error.responseCode !== 452) {
        return true;
      }
    }

    // Серверные ошибки (5xx) кроме постоянных
    if (error.responseCode && error.responseCode >= 500) {
      // 550 - mailbox unavailable, 551 - user not local - не повторять
      if (error.responseCode !== 550 && error.responseCode !== 551) {
        return true;
      }
    }

    return false;
  }
}
