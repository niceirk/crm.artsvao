import { OnModuleDestroy, Logger } from '@nestjs/common';
import { Subject, Observable, interval, merge } from 'rxjs';
import { takeUntil, map, finalize } from 'rxjs/operators';
import { MessageEvent } from '@nestjs/common';

// Диагностика SSE
const SSE_WARNING_THRESHOLD = 50; // Предупреждение при > 50 соединений
const SSE_DIAGNOSTIC_INTERVAL_MS = 30000; // Логировать каждые 30 сек

/**
 * Базовый сервис для SSE (Server-Sent Events) с поддержкой:
 * - Heartbeat для поддержания соединений через nginx/proxy
 * - Автоматическая очистка при отключении клиента
 * - Graceful shutdown при остановке модуля
 * - Мониторинг активных соединений
 */
export abstract class BaseSseService<T = any> implements OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);

  // Основной поток событий
  protected readonly events$ = new Subject<T>();

  // Сигнал для завершения всех подписок
  protected readonly destroy$ = new Subject<void>();

  // Счётчик активных SSE соединений
  private activeConnections = 0;

  // Heartbeat интервал (30 секунд - меньше чем nginx proxy_read_timeout)
  private readonly HEARTBEAT_INTERVAL_MS = 30000;

  // Диагностика
  private peakConnections = 0;
  private totalConnectionsOpened = 0;
  private totalConnectionsClosed = 0;
  private diagnosticInterval: NodeJS.Timeout | null = null;

  /**
   * Получить количество активных SSE соединений
   */
  getActiveConnections(): number {
    return this.activeConnections;
  }

  /**
   * Получить SSE stream с heartbeat и автоматической очисткой.
   * Heartbeat предотвращает закрытие соединения nginx/proxy при idle.
   */
  protected createSseStream(
    sourceObservable: Observable<T>,
    transformer: (event: T) => MessageEvent,
  ): Observable<MessageEvent> {
    this.activeConnections++;
    this.totalConnectionsOpened++;

    // Обновляем пик
    if (this.activeConnections > this.peakConnections) {
      this.peakConnections = this.activeConnections;
    }

    // Запускаем диагностику при первом соединении
    if (this.activeConnections === 1) {
      this.startDiagnosticLogging();
    }

    this.logger.log(
      `[SSE] Connection opened. Active: ${this.activeConnections}, Peak: ${this.peakConnections}, Total: ${this.totalConnectionsOpened}`,
    );

    // Предупреждение при большом количестве соединений
    if (this.activeConnections > SSE_WARNING_THRESHOLD) {
      this.logger.warn(
        `[SSE] WARNING: High connection count (${this.activeConnections} > ${SSE_WARNING_THRESHOLD})!`,
      );
    }

    // Heartbeat stream - отправляет пустое событие каждые 30 секунд
    const heartbeat$ = interval(this.HEARTBEAT_INTERVAL_MS).pipe(
      takeUntil(this.destroy$),
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          }),
        }),
      ),
    );

    // Основной поток событий
    const events$ = sourceObservable.pipe(
      takeUntil(this.destroy$),
      map(transformer),
    );

    // Объединяем события и heartbeat
    return merge(events$, heartbeat$).pipe(
      finalize(() => {
        this.activeConnections--;
        this.totalConnectionsClosed++;
        this.logger.log(
          `[SSE] Connection closed. Active: ${this.activeConnections}, Closed total: ${this.totalConnectionsClosed}`,
        );

        // Останавливаем диагностику когда нет соединений
        if (this.activeConnections === 0) {
          this.stopDiagnosticLogging();
        }
      }),
    );
  }

  /**
   * Запуск периодического логирования статистики SSE соединений
   */
  private startDiagnosticLogging() {
    if (this.diagnosticInterval) return;

    this.diagnosticInterval = setInterval(() => {
      this.logger.log(
        `[SSE] Stats: active=${this.activeConnections}, peak=${this.peakConnections}, ` +
        `opened=${this.totalConnectionsOpened}, closed=${this.totalConnectionsClosed}`,
      );

      if (this.activeConnections > SSE_WARNING_THRESHOLD) {
        this.logger.warn(
          `[SSE] WARNING: Connection count above threshold (${this.activeConnections} > ${SSE_WARNING_THRESHOLD})`,
        );
      }
    }, SSE_DIAGNOSTIC_INTERVAL_MS);
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
   * Отправить событие всем подписчикам
   */
  protected emit(event: T): void {
    this.events$.next(event);
  }

  /**
   * Graceful shutdown - завершает все SSE соединения
   */
  onModuleDestroy() {
    this.logger.log(
      `[SSE] Shutting down. Final stats: active=${this.activeConnections}, peak=${this.peakConnections}, ` +
      `opened=${this.totalConnectionsOpened}, closed=${this.totalConnectionsClosed}`,
    );

    // Останавливаем диагностику
    this.stopDiagnosticLogging();

    // Сигнализируем всем подписчикам о завершении
    this.destroy$.next();
    this.destroy$.complete();

    // Завершаем основной поток событий
    this.events$.complete();

    this.logger.log('[SSE] Service shutdown complete');
  }

  /**
   * Получение статистики SSE соединений для мониторинга
   */
  getSseStats() {
    return {
      activeConnections: this.activeConnections,
      peakConnections: this.peakConnections,
      totalConnectionsOpened: this.totalConnectionsOpened,
      totalConnectionsClosed: this.totalConnectionsClosed,
    };
  }
}
