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

  // Adaptive polling intervals
  private currentInterval = 5000; // Start with 5 seconds
  private readonly minInterval = 5000; // 5 seconds minimum
  private readonly maxInterval = 30000; // 30 seconds maximum
  private emptyQueueCount = 0;

  // Circuit breaker state
  private consecutiveErrors = 0;
  private readonly maxConsecutiveErrors = 5;
  private readonly errorBackoffMs = 60000; // 1 минута при активации circuit breaker
  private circuitBreakerActive = false;

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
    this.batchSize = this.configService.get<number>('NOTIFICATION_BATCH_SIZE', 20);
    this.maxRetries = this.configService.get<number>('NOTIFICATION_MAX_RETRIES', 5);
    this.telegramRateLimit = this.configService.get<number>('TELEGRAM_RATE_LIMIT', 30);
    this.emailHourlyLimit = this.configService.get<number>('EMAIL_HOURLY_LIMIT', 20);
    this.emailDailyLimit = this.configService.get<number>('EMAIL_DAILY_LIMIT', 500);
  }

  onModuleInit() {
    if (process.env.NOTIFICATION_WORKER_ENABLED === 'true') {
      this.startWorker();
    } else {
      this.logger.log('Notification worker disabled (NOTIFICATION_WORKER_ENABLED !== true)');
    }
  }

  onModuleDestroy() {
    this.stopWorker();
  }

  private startWorker(): void {
    this.logger.log('Starting notification queue worker with adaptive polling...');
    this.isRunning = true;
    this.scheduleNextPoll();
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;
    this.intervalId = setTimeout(() => this.processQueue(), this.currentInterval);
  }

  private adjustPollingInterval(hasNotifications: boolean): void {
    if (hasNotifications) {
      // Reset to minimum interval when there's work to do
      this.currentInterval = this.minInterval;
      this.emptyQueueCount = 0;
    } else {
      // Gradually increase interval when queue is empty (backoff)
      this.emptyQueueCount++;
      if (this.emptyQueueCount >= 3) {
        this.currentInterval = Math.min(this.currentInterval * 1.5, this.maxInterval);
      }
    }
  }

  private stopWorker(): void {
    this.logger.log('Stopping notification queue worker...');
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
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
      const notifications = await this.prisma.safe.notification.findMany({
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

      // Adjust polling interval based on queue state
      this.adjustPollingInterval(notifications.length > 0);

      for (const notification of notifications) {
        if (!this.canSend(notification.channel)) {
          continue; // Rate limited, skip for now
        }

        await this.processNotification(notification);
      }

      // Успешная итерация - сбрасываем circuit breaker
      if (this.consecutiveErrors > 0) {
        this.logger.log('Queue processing successful, resetting error counter');
      }
      this.consecutiveErrors = 0;
      if (this.circuitBreakerActive) {
        this.circuitBreakerActive = false;
        this.currentInterval = this.minInterval;
        this.logger.log('Circuit breaker deactivated, resuming normal operation');
      }
    } catch (error) {
      this.consecutiveErrors++;
      this.logger.error(
        `Queue processing error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}): ${error.message}`,
        error.stack,
      );

      // Активация circuit breaker при множественных ошибках
      if (this.consecutiveErrors >= this.maxConsecutiveErrors && !this.circuitBreakerActive) {
        this.circuitBreakerActive = true;
        this.currentInterval = this.errorBackoffMs;
        this.logger.warn(
          `Circuit breaker activated! Too many consecutive errors. Pausing for ${this.errorBackoffMs / 1000}s`,
        );
      }
    } finally {
      // Schedule next poll
      this.scheduleNextPoll();
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
      await this.prisma.safe.notification.update({
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
    await this.prisma.safe.notification.update({
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
    await this.prisma.safe.notification.update({
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

    await this.prisma.safe.notification.update({
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
    circuitBreaker: {
      active: boolean;
      consecutiveErrors: number;
      currentInterval: number;
    };
  }> {
    const [pending, processing, sent, failed] = await Promise.all([
      this.prisma.safe.notification.count({
        where: { status: NotificationStatus.PENDING },
      }),
      this.prisma.safe.notification.count({
        where: { status: NotificationStatus.PROCESSING },
      }),
      this.prisma.safe.notification.count({
        where: { status: NotificationStatus.SENT },
      }),
      this.prisma.safe.notification.count({
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
      circuitBreaker: {
        active: this.circuitBreakerActive,
        consecutiveErrors: this.consecutiveErrors,
        currentInterval: this.currentInterval,
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
