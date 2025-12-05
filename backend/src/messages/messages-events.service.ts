import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BaseSseService } from '../common/events/base-sse.service';

/**
 * Событие мессенджера
 */
export interface MessagesEvent {
  type: 'unread-count' | 'new-message';
  count?: number;
  conversationId?: string;
  createdAt?: Date;
}

/**
 * Сервис для рассылки событий мессенджера (SSE).
 * Отдельный провайдер, чтобы использовать его и в TelegramModule, и в MessagesModule без циклов.
 *
 * Поддерживает:
 * - Heartbeat каждые 30 секунд для поддержания соединений через nginx
 * - Автоматическую очистку при отключении клиента
 * - Graceful shutdown при остановке модуля
 * - Мониторинг активных соединений
 */
@Injectable()
export class MessagesEventsService extends BaseSseService<MessagesEvent> {
  /**
   * Стрим событий для SSE контроллера с heartbeat.
   */
  getEventsStream(): Observable<MessageEvent> {
    return this.createSseStream(this.events$.asObservable(), (event) => ({
      type: event.type,
      data: event,
    }));
  }

  /**
   * Рассылает новое значение счётчика непрочитанных.
   */
  emitUnreadCount(count: number) {
    this.emit({
      type: 'unread-count',
      count,
    });
  }

  /**
   * Рассылает событие о новом входящем сообщении.
   */
  emitNewMessage(conversationId: string, createdAt: Date) {
    this.emit({
      type: 'new-message',
      conversationId,
      createdAt,
    });
  }
}
