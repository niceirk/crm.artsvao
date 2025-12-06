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

// Keepalive настройки - оптимизированные для облачных БД (TWC закрывает idle за 5 минут)
// Снижаем нагрузку на БД: ping только когда нет реальной активности
const KEEPALIVE_INTERVAL_MS = 30000; // Ping каждые 30 секунд (было 15)
const KEEPALIVE_PING_COUNT = 1; // Один ping достаточно (было 3)
const KEEPALIVE_SKIP_IF_ACTIVE_MS = 10000; // Пропускать keepalive если была активность < 10 сек назад

// Reconnect настройки
const MAX_RECONNECT_ATTEMPTS = 5; // Увеличено с 3
const RECONNECT_BASE_DELAY_MS = 500; // Уменьшено с 1000

// Health check настройки
const HEALTH_CHECK_TIMEOUT_MS = 5000;
const HEALTH_CHECK_RETRIES = 3; // Увеличено с 2

// Диагностика - логирование статистики
const DIAGNOSTIC_LOG_INTERVAL_MS = 30000; // Логировать статистику каждые 30 сек

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // Keepalive state
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private lastActivityTimestamp: number = Date.now();
  private isShuttingDown = false;

  // Reconnect state
  private isReconnecting = false;
  private reconnectPromise: Promise<void> | null = null;

  // Метрики для мониторинга
  private keepalivePingCount = 0;
  private keepaliveFailCount = 0;
  private lastSuccessfulPing: Date | null = null;
  private connectionErrorCount = 0;

  // Диагностика
  private diagnosticInterval: NodeJS.Timeout | null = null;
  private activeQueryCount = 0;
  private peakQueryCount = 0;
  private totalQueryCount = 0;

  // Safe client с retry логикой (lazy initialization)
  // Используем тип PrismaClient для совместимости с моделями
  private _safeClient: PrismaClient | null = null;

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
   * Настройка логирования медленных запросов и мониторинга активных запросов
   */
  private setupQueryLogging() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.$on as any)('query', (e: Prisma.QueryEvent) => {
      this.totalQueryCount++;
      // Автоматически обновляем timestamp активности при каждом запросе
      // Это позволяет keepalive пропускать ping'и когда БД активно используется
      this.lastActivityTimestamp = Date.now();

      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `[PRISMA] SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 200)}${e.query.length > 200 ? '...' : ''}`,
        );
      } else if (process.env.NODE_ENV === 'development' && e.duration > 100) {
        // В development логируем запросы > 100ms для отладки
        this.logger.debug(`Query (${e.duration}ms): ${e.query.substring(0, 100)}...`);
      }
    });
  }

  /**
   * Запуск периодического логирования статистики соединений для диагностики
   */
  private startDiagnosticLogging() {
    if (this.diagnosticInterval) return;

    this.diagnosticInterval = setInterval(() => {
      if (this.isShuttingDown) return;

      const stats = this.getConnectionStats();
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      this.logger.log(
        `[PRISMA] Stats: queries=${this.totalQueryCount}, ` +
        `pings=${stats.keepalivePingCount}, fails=${stats.keepaliveFailCount}, ` +
        `errors=${stats.connectionErrorCount}, idle=${Math.round(stats.idleTimeMs / 1000)}s, ` +
        `heap=${heapUsedMB}/${heapTotalMB}MB`,
      );

      // Предупреждение если много ошибок
      if (stats.connectionErrorCount > 10) {
        this.logger.warn(
          `[PRISMA] High connection error count: ${stats.connectionErrorCount}`,
        );
      }
    }, DIAGNOSTIC_LOG_INTERVAL_MS);

    this.logger.log(`[PRISMA] Diagnostic logging started (interval: ${DIAGNOSTIC_LOG_INTERVAL_MS}ms)`);
  }

  /**
   * Остановка диагностического логирования
   */
  private stopDiagnosticLogging() {
    if (this.diagnosticInterval) {
      clearInterval(this.diagnosticInterval);
      this.diagnosticInterval = null;
    }
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
        // Запускаем диагностическое логирование
        this.startDiagnosticLogging();
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
    this.logger.log('PrismaService: Starting graceful shutdown...');
    this.isShuttingDown = true;

    // Останавливаем keepalive и диагностику
    this.stopKeepalive('module_destroy');
    this.stopDiagnosticLogging();

    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error(`Error disconnecting from database: ${(error as Error).message}`);
    }

    this.logger.log(
      `PrismaService shutdown complete. Stats: pings=${this.keepalivePingCount}, fails=${this.keepaliveFailCount}, errors=${this.connectionErrorCount}`,
    );
  }

  /**
   * Запуск keepalive механизма для поддержания соединений живыми.
   * ВАЖНО: Делаем ping ВСЕГДА при каждом интервале, чтобы поддерживать ВСЕ соединения в пуле.
   * Облачные БД (TWC) закрывают idle соединения через 5 минут.
   */
  private startKeepalive() {
    if (this.keepaliveInterval) {
      this.logger.warn('Keepalive already running, skipping restart');
      return;
    }

    if (this.isShuttingDown) {
      this.logger.warn('Cannot start keepalive during shutdown');
      return;
    }

    this.keepaliveInterval = setInterval(async () => {
      // Защита от работы во время shutdown
      if (this.isShuttingDown) {
        return;
      }

      // Пропускаем keepalive если недавно была реальная активность
      const timeSinceActivity = Date.now() - this.lastActivityTimestamp;
      if (timeSinceActivity < KEEPALIVE_SKIP_IF_ACTIVE_MS) {
        this.logger.debug(
          `Keepalive skipped: recent activity ${Math.round(timeSinceActivity / 1000)}s ago`,
        );
        return;
      }

      // Делаем ping для поддержания соединения
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < KEEPALIVE_PING_COUNT; i++) {
        try {
          await this.$queryRaw`SELECT 1`;
          successCount++;
          this.keepalivePingCount++;
          this.lastSuccessfulPing = new Date();
        } catch (error) {
          failCount++;
          this.keepaliveFailCount++;
          const errorMessage = (error as Error).message;

          // Логируем только первую ошибку в серии
          if (failCount === 1) {
            this.logger.warn(`Keepalive ping ${i + 1}/${KEEPALIVE_PING_COUNT} failed: ${errorMessage}`);
          }

          // Если это connection error - пробуем reconnect
          if (this.isConnectionError(errorMessage)) {
            this.connectionErrorCount++;
            this.handleDeadConnection().catch((err) => {
              this.logger.error(`Reconnect after keepalive failure failed: ${err.message}`);
            });
            break; // Прерываем цикл, reconnect сам восстановит
          }
        }
      }

      this.lastActivityTimestamp = Date.now();

      // Логируем только если все успешно или были ошибки
      if (failCount === 0) {
        this.logger.debug(
          `Keepalive: ${successCount}/${KEEPALIVE_PING_COUNT} pings OK (total: ${this.keepalivePingCount})`,
        );
      } else if (successCount > 0) {
        this.logger.warn(
          `Keepalive: ${successCount}/${KEEPALIVE_PING_COUNT} pings OK, ${failCount} failed`,
        );
      }
    }, KEEPALIVE_INTERVAL_MS);

    this.logger.log(`Database keepalive started (interval: ${KEEPALIVE_INTERVAL_MS}ms, pings: ${KEEPALIVE_PING_COUNT})`);
  }

  /**
   * Остановка keepalive механизма.
   * Должна вызываться ТОЛЬКО при shutdown.
   */
  private stopKeepalive(reason: string = 'unknown') {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
      this.logger.log(
        `Database keepalive stopped (reason: ${reason}, total pings: ${this.keepalivePingCount}, fails: ${this.keepaliveFailCount})`,
      );
    }
  }

  /**
   * Обработка мёртвого соединения с автоматическим reconnect.
   * Защищён от множественных одновременных вызовов.
   */
  async handleDeadConnection(): Promise<void> {
    // Не делаем reconnect во время shutdown
    if (this.isShuttingDown) {
      this.logger.debug('Reconnect skipped: shutdown in progress');
      return;
    }

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
   * @deprecated Используйте getter `safe` вместо этого метода
   */
  get withRetry() {
    return this.$extends(retryExtension);
  }

  /**
   * Безопасный клиент с автоматическим retry при ошибках соединения.
   * Используйте this.prisma.safe вместо this.prisma для критических запросов.
   *
   * Ретраит: P1001, P1002, P1008, P1017, P2024, 57P01-57P05, 08003, 08006
   * НЕ ретраит бизнес-ошибки: P2002 (unique), P2003 (FK) и т.д.
   *
   * @example
   * const user = await this.prisma.safe.user.findUnique({ where: { id } });
   */
  get safe(): PrismaClient {
    if (!this._safeClient) {
      // Приводим к PrismaClient для совместимости типов с моделями
      this._safeClient = this.$extends(retryExtension) as unknown as PrismaClient;
    }
    return this._safeClient;
  }

  /**
   * Получение статистики соединения для мониторинга.
   * Используется в health check endpoint.
   */
  getConnectionStats() {
    return {
      isShuttingDown: this.isShuttingDown,
      isReconnecting: this.isReconnecting,
      keepaliveRunning: this.keepaliveInterval !== null,
      keepalivePingCount: this.keepalivePingCount,
      keepaliveFailCount: this.keepaliveFailCount,
      connectionErrorCount: this.connectionErrorCount,
      lastSuccessfulPing: this.lastSuccessfulPing,
      lastActivityTimestamp: new Date(this.lastActivityTimestamp),
      idleTimeMs: Date.now() - this.lastActivityTimestamp,
    };
  }
}
