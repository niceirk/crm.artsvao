import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BaseSseService } from './base-sse.service';

/**
 * Типы событий изменения данных
 */
export type DataChangeType = 'created' | 'updated' | 'deleted';

/**
 * Поддерживаемые сущности для отслеживания
 */
export type TrackedEntity =
  | 'subscription'
  | 'attendance'
  | 'invoice'
  | 'payment'
  | 'client'
  | 'schedule'
  | 'group'
  | 'medicalCertificate';

/**
 * Событие изменения данных
 */
export interface DataChangeEvent {
  type: DataChangeType;
  entity: TrackedEntity;
  entityId: string;
  data: any;
  userId?: string;
  timestamp: Date;
}

/**
 * Сервис для рассылки событий об изменениях данных (SSE).
 * Позволяет frontend подписаться на изменения и автоматически обновлять UI.
 *
 * Поддерживает:
 * - Heartbeat каждые 30 секунд для поддержания соединений через nginx
 * - Автоматическую очистку при отключении клиента
 * - Graceful shutdown при остановке модуля
 * - Мониторинг активных соединений
 */
@Injectable()
export class DataEventsService extends BaseSseService<DataChangeEvent> {
  /**
   * Получить стрим всех событий (для SSE контроллера)
   */
  getEventsStream(): Observable<MessageEvent> {
    return this.createSseStream(this.events$.asObservable(), (event) => ({
      type: 'data-change',
      data: JSON.stringify(event),
    }));
  }

  /**
   * Получить стрим событий для конкретных сущностей с heartbeat
   */
  getFilteredStream(entities?: TrackedEntity[]): Observable<MessageEvent> {
    const filteredEvents$ = this.events$.asObservable().pipe(
      filter((event) => !entities || entities.includes(event.entity)),
    );

    return this.createSseStream(filteredEvents$, (event) => ({
      type: 'data-change',
      data: JSON.stringify(event),
    }));
  }

  /**
   * Отправить событие о создании записи
   */
  emitCreated(
    entity: TrackedEntity,
    entityId: string,
    data: any,
    userId?: string,
  ): void {
    this.emit({
      type: 'created',
      entity,
      entityId,
      data,
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Отправить событие об обновлении записи
   */
  emitUpdated(
    entity: TrackedEntity,
    entityId: string,
    data: any,
    userId?: string,
  ): void {
    this.emit({
      type: 'updated',
      entity,
      entityId,
      data,
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Отправить событие об удалении записи
   */
  emitDeleted(entity: TrackedEntity, entityId: string, userId?: string): void {
    this.emit({
      type: 'deleted',
      entity,
      entityId,
      data: null,
      userId,
      timestamp: new Date(),
    });
  }
}
