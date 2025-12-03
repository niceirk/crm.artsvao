import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { retryExtension } from './prisma-retry.extension';

const SLOW_QUERY_THRESHOLD_MS = 1000;
const MAX_CONNECT_RETRIES = 5;
const CONNECT_RETRY_BASE_DELAY_MS = 2000;

// Keepalive настройки - более агрессивные для облачных БД
// Облачные PostgreSQL (TWC, Supabase и др.) закрывают idle соединения через 5-10 минут
const KEEPALIVE_INTERVAL_MS = 30000; // Проверка каждые 30 секунд
const STALE_CONNECTION_THRESHOLD_MS = 60000; // Если idle > 1 минуты - делаем ping

// Reconnect настройки
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1000;

// Health check настройки
const HEALTH_CHECK_TIMEOUT_MS = 5000;
const HEALTH_CHECK_RETRIES = 2;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // Keepalive state
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private lastActivityTimestamp: number = Date.now();

  // Reconnect state
  private isReconnecting = false;
  private reconnectPromise: Promise<void> | null = null;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ]
          : [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }],
    });

    this.setupQueryLogging();
  }

  /**
   * Настройка логирования медленных запросов
   */
  private setupQueryLogging() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.$on as any)('query', (e: Prisma.QueryEvent) => {
      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 200)}${e.query.length > 200 ? '...' : ''}`,
        );
      } else if (process.env.NODE_ENV === 'development' && e.duration > 100) {
        // В development логируем запросы > 100ms для отладки
        this.logger.debug(`Query (${e.duration}ms): ${e.query.substring(0, 100)}...`);
      }
    });
  }

  /**
   * Подключение к БД с retry логикой при старте
   */
  async onModuleInit() {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log(
          `Database connected successfully (attempt ${attempt}/${MAX_CONNECT_RETRIES})`,
        );
        // Запускаем keepalive после успешного подключения
        this.startKeepalive();
        this.lastActivityTimestamp = Date.now();
        return;
      } catch (error) {
        lastError = error as Error;
        const delay = CONNECT_RETRY_BASE_DELAY_MS * attempt;

        if (attempt < MAX_CONNECT_RETRIES) {
          this.logger.warn(
            `Database connection attempt ${attempt}/${MAX_CONNECT_RETRIES} failed: ${(error as Error).message}. ` +
              `Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `Failed to connect to database after ${MAX_CONNECT_RETRIES} attempts`,
      lastError?.stack,
    );
    throw lastError;
  }

  async onModuleDestroy() {
    // Останавливаем keepalive
    this.stopKeepalive();
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Запуск keepalive механизма для поддержания соединений живыми
   */
  private startKeepalive() {
    if (this.keepaliveInterval) {
      return; // Уже запущен
    }

    this.keepaliveInterval = setInterval(async () => {
      const idleTime = Date.now() - this.lastActivityTimestamp;

      // Если соединение долго не использовалось - делаем ping
      if (idleTime > STALE_CONNECTION_THRESHOLD_MS) {
        try {
          await this.$queryRaw`SELECT 1`;
          this.logger.debug(
            `Keepalive ping successful (idle time: ${Math.round(idleTime / 1000)}s)`,
          );
          this.lastActivityTimestamp = Date.now();
        } catch (error) {
          this.logger.warn(
            `Keepalive ping failed, triggering reconnect: ${(error as Error).message}`,
          );
          // Запускаем reconnect в фоне
          this.handleDeadConnection().catch((err) => {
            this.logger.error(`Reconnect after keepalive failure failed: ${err.message}`);
          });
        }
      }
    }, KEEPALIVE_INTERVAL_MS);

    this.logger.log('Database keepalive started');
  }

  /**
   * Остановка keepalive механизма
   */
  private stopKeepalive() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
      this.logger.log('Database keepalive stopped');
    }
  }

  /**
   * Обработка мёртвого соединения с автоматическим reconnect.
   * Защищён от множественных одновременных вызовов.
   */
  async handleDeadConnection(): Promise<void> {
    // Предотвращаем множественные одновременные reconnect
    if (this.isReconnecting && this.reconnectPromise) {
      this.logger.debug('Reconnect already in progress, waiting...');
      return this.reconnectPromise;
    }

    this.isReconnecting = true;
    this.reconnectPromise = this.performReconnect();

    try {
      await this.reconnectPromise;
    } finally {
      this.isReconnecting = false;
      this.reconnectPromise = null;
    }
  }

  /**
   * Выполнение переподключения к БД с retry логикой
   */
  private async performReconnect(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      try {
        this.logger.warn(
          `Attempting database reconnect (${attempt}/${MAX_RECONNECT_ATTEMPTS})...`,
        );

        // Сначала пытаемся отключиться (игнорируем ошибки)
        try {
          await this.$disconnect();
        } catch {
          // Игнорируем ошибки disconnect
        }

        // Ждем перед reconnect с exponential backoff
        const delay = RECONNECT_BASE_DELAY_MS * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Пытаемся подключиться
        await this.$connect();

        // Проверяем соединение
        await this.$queryRaw`SELECT 1`;

        this.logger.log(`Database reconnected successfully (attempt ${attempt})`);
        this.lastActivityTimestamp = Date.now();
        return;
      } catch (error) {
        this.logger.error(
          `Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} failed: ${(error as Error).message}`,
        );

        if (attempt === MAX_RECONNECT_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  /**
   * Проверяет, является ли ошибка связанной с соединением
   */
  private isConnectionError(errorMessage: string): boolean {
    return (
      errorMessage.includes('57P05') ||
      errorMessage.includes('idle-session') ||
      errorMessage.includes('idle_session_timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('EPIPE') ||
      errorMessage.includes('57P01') ||
      errorMessage.includes('57P02') ||
      errorMessage.includes('57P03') ||
      errorMessage.includes('08006') ||
      errorMessage.includes('08003')
    );
  }

  /**
   * Проверка здоровья БД с таймаутом и автоматическим восстановлением
   */
  async healthCheck(): Promise<boolean> {
    for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
      try {
        const result = await Promise.race([
          this.$queryRaw`SELECT 1 as health`,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Health check timeout')),
              HEALTH_CHECK_TIMEOUT_MS,
            ),
          ),
        ]);

        this.lastActivityTimestamp = Date.now();
        return Array.isArray(result) && result.length > 0;
      } catch (error) {
        const errorMessage = (error as Error).message;

        this.logger.warn(
          `Health check attempt ${attempt}/${HEALTH_CHECK_RETRIES} failed: ${errorMessage}`,
        );

        // Если это connection error и есть ещё попытки - пробуем reconnect
        if (this.isConnectionError(errorMessage) && attempt < HEALTH_CHECK_RETRIES) {
          try {
            await this.handleDeadConnection();
            continue; // Повторяем health check после reconnect
          } catch (reconnectError) {
            this.logger.error(
              `Reconnect during health check failed: ${(reconnectError as Error).message}`,
            );
          }
        }
      }
    }

    this.logger.error('Database health check failed after all attempts');
    return false;
  }

  /**
   * Обновляет timestamp последней активности.
   * Вызывайте после успешных операций с БД для корректной работы keepalive.
   */
  updateActivity() {
    this.lastActivityTimestamp = Date.now();
  }

  /**
   * Получение расширенного клиента с retry логикой.
   * Используйте для критичных операций где важна устойчивость к временным сбоям.
   */
  get withRetry() {
    return this.$extends(retryExtension);
  }
}
