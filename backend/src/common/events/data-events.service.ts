import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

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
 */
@Injectable()
export class DataEventsService {
  private readonly events$ = new Subject<DataChangeEvent>();

  /**
   * Получить стрим всех событий (для SSE контроллера)
   */
  getEventsStream(): Observable<MessageEvent> {
    return this.events$.pipe(
      map((event) => ({
        type: 'data-change',
        data: JSON.stringify(event),
      })),
    );
  }

  /**
   * Получить стрим событий для конкретных сущностей
   */
  getFilteredStream(entities?: TrackedEntity[]): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((event) => !entities || entities.includes(event.entity)),
      map((event) => ({
        type: 'data-change',
        data: JSON.stringify(event),
      })),
    );
  }

  /**
   * Базовый метод отправки события
   */
  emit(event: DataChangeEvent): void {
    this.events$.next(event);
  }

  /**
   * Отправить событие о создании записи
   */
  emitCreated(entity: TrackedEntity, entityId: string, data: any, userId?: string): void {
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
  emitUpdated(entity: TrackedEntity, entityId: string, data: any, userId?: string): void {
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
