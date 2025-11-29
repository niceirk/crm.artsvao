import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramChannelAdapter } from './channels/telegram.channel';
import { EmailChannelAdapter } from './channels/email.channel';
import { NotificationRendererService } from './notification-renderer.service';
import { NotificationStatus, NotificationChannel, Notification } from '@prisma/client';

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Rate limiting state
  private telegramSentThisSecond = 0;
  private emailSentThisHour = 0;
  private emailSentToday = 0;
  private lastSecondReset = Date.now();
  private lastHourReset = Date.now();
  private lastDayReset = Date.now();

  // Configuration
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly telegramRateLimit: number;
  private readonly emailHourlyLimit: number;
  private readonly emailDailyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramChannel: TelegramChannelAdapter,
    private readonly emailChannel: EmailChannelAdapter,
    private readonly rendererService: NotificationRendererService,
    private readonly configService: ConfigService,
  ) {
    this.batchSize = this.configService.get<number>('NOTIFICATION_BATCH_SIZE', 50);
    this.maxRetries = this.configService.get<number>('NOTIFICATION_MAX_RETRIES', 5);
    this.telegramRateLimit = this.configService.get<number>('TELEGRAM_RATE_LIMIT', 30);
    this.emailHourlyLimit = this.configService.get<number>('EMAIL_HOURLY_LIMIT', 20);
    this.emailDailyLimit = this.configService.get<number>('EMAIL_DAILY_LIMIT', 500);
  }

  onModuleInit() {
    this.startWorker();
  }

  onModuleDestroy() {
    this.stopWorker();
  }

  private startWorker(): void {
    this.logger.log('Starting notification queue worker...');
    this.isRunning = true;
    this.intervalId = setInterval(() => this.processQueue(), 1000);
  }

  private stopWorker(): void {
    this.logger.log('Stopping notification queue worker...');
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Основной цикл обработки очереди
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.resetRateLimitCounters();

      const now = new Date();
      const notifications = await this.prisma.notification.findMany({
        where: {
          status: NotificationStatus.PENDING,
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { nextRetryAt: null },
                { nextRetryAt: { lte: now } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: this.batchSize,
        include: { template: true },
      });

      for (const notification of notifications) {
        if (!this.canSend(notification.channel)) {
          continue; // Rate limited, skip for now
        }

        await this.processNotification(notification);
      }
    } catch (error) {
      this.logger.error(`Queue processing error: ${error.message}`, error.stack);
    }
  }

  /**
   * Обработка одного уведомления
   */
  private async processNotification(
    notification: Notification & { template: any },
  ): Promise<void> {
    try {
      // Помечаем как обрабатываемое
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.PROCESSING,
          attempts: { increment: 1 },
        },
      });

      // Рендерим контент
      const content = await this.rendererService.render(
        notification.template,
        (notification.payload as Record<string, any>) || {},
      );

      // Получаем канал
      const channel =
        notification.channel === NotificationChannel.TELEGRAM
          ? this.telegramChannel
          : this.emailChannel;

      // Отправляем
      const result = await channel.send(notification.recipientAddress, content);

      if (result.success) {
        await this.markAsSent(notification.id, result.externalId);
        this.incrementRateLimit(notification.channel);
        this.logger.log(
          `Notification ${notification.id} sent successfully via ${notification.channel}`,
        );
      } else if (result.retryable && notification.attempts < this.maxRetries) {
        await this.scheduleRetry(notification);
        this.logger.warn(
          `Notification ${notification.id} scheduled for retry (attempt ${notification.attempts + 1})`,
        );
      } else {
        await this.markAsFailed(notification.id, result.error);
        this.logger.error(
          `Notification ${notification.id} failed permanently: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing notification ${notification.id}: ${error.message}`,
        error.stack,
      );
      await this.handleError(notification, error);
    }
  }

  /**
   * Пометить как отправленное
   */
  private async markAsSent(id: string, externalId?: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        externalId,
        lastError: null,
      },
    });
  }

  /**
   * Пометить как неудачное
   */
  private async markAsFailed(id: string, error?: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        lastError: error,
      },
    });
  }

  /**
   * Запланировать повторную попытку с экспоненциальной задержкой
   */
  private async scheduleRetry(notification: Notification): Promise<void> {
    const delay = this.calculateRetryDelay(notification.attempts);
    const nextRetryAt = new Date(Date.now() + delay);

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.PENDING,
        nextRetryAt,
        lastError: `Retry scheduled for ${nextRetryAt.toISOString()}`,
      },
    });
  }

  /**
   * Обработка ошибки при обработке уведомления
   */
  private async handleError(notification: Notification, error: Error): Promise<void> {
    if (notification.attempts >= this.maxRetries) {
      await this.markAsFailed(notification.id, error.message);
    } else {
      await this.scheduleRetry(notification);
    }
  }

  /**
   * Расчет задержки для повторной попытки
   * Экспоненциальная задержка: 30с, 2м, 8м, 32м, 2ч
   */
  private calculateRetryDelay(attempts: number): number {
    const baseDelay = 30; // 30 секунд
    const maxDelay = 7200; // 2 часа в секундах
    const delay = Math.min(baseDelay * Math.pow(4, attempts), maxDelay);
    return delay * 1000; // в миллисекундах
  }

  /**
   * Проверка возможности отправки по каналу (rate limiting)
   */
  private canSend(channel: NotificationChannel): boolean {
    if (channel === NotificationChannel.TELEGRAM) {
      return this.telegramSentThisSecond < this.telegramRateLimit;
    }
    if (channel === NotificationChannel.EMAIL) {
      return (
        this.emailSentThisHour < this.emailHourlyLimit &&
        this.emailSentToday < this.emailDailyLimit
      );
    }
    return true;
  }

  /**
   * Инкремент счетчиков rate limit
   */
  private incrementRateLimit(channel: NotificationChannel): void {
    if (channel === NotificationChannel.TELEGRAM) {
      this.telegramSentThisSecond++;
    }
    if (channel === NotificationChannel.EMAIL) {
      this.emailSentThisHour++;
      this.emailSentToday++;
    }
  }

  /**
   * Сброс счетчиков rate limit
   */
  private resetRateLimitCounters(): void {
    const now = Date.now();

    // Сброс каждую секунду для Telegram
    if (now - this.lastSecondReset >= 1000) {
      this.telegramSentThisSecond = 0;
      this.lastSecondReset = now;
    }

    // Сброс каждый час для Email
    if (now - this.lastHourReset >= 3600000) {
      this.emailSentThisHour = 0;
      this.lastHourReset = now;
    }

    // Сброс каждый день
    if (now - this.lastDayReset >= 86400000) {
      this.emailSentToday = 0;
      this.lastDayReset = now;
    }
  }

  /**
   * Получение статистики очереди
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    rateLimits: {
      telegramSentThisSecond: number;
      emailSentThisHour: number;
      emailSentToday: number;
    };
  }> {
    const [pending, processing, sent, failed] = await Promise.all([
      this.prisma.notification.count({
        where: { status: NotificationStatus.PENDING },
      }),
      this.prisma.notification.count({
        where: { status: NotificationStatus.PROCESSING },
      }),
      this.prisma.notification.count({
        where: { status: NotificationStatus.SENT },
      }),
      this.prisma.notification.count({
        where: { status: NotificationStatus.FAILED },
      }),
    ]);

    return {
      pending,
      processing,
      sent,
      failed,
      rateLimits: {
        telegramSentThisSecond: this.telegramSentThisSecond,
        emailSentThisHour: this.emailSentThisHour,
        emailSentToday: this.emailSentToday,
      },
    };
  }

  /**
   * Ручной запуск обработки очереди (для тестирования)
   */
  async triggerProcessing(): Promise<void> {
    await this.processQueue();
  }
}
