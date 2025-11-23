import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

/**
 * Сервис для рассылки событий мессенджера (SSE).
 * Отдельный провайдер, чтобы использовать его и в TelegramModule, и в MessagesModule без циклов.
 */
@Injectable()
export class MessagesEventsService {
  private readonly events$ = new Subject<MessageEvent>();

  /**
   * Стрим событий для SSE контроллера.
   */
  getEventsStream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  /**
   * Рассылает новое значение счётчика непрочитанных.
   */
  emitUnreadCount(count: number) {
    this.events$.next({
      type: 'unread-count',
      data: { type: 'unread-count', count },
    });
  }

  /**
   * Рассылает событие о новом входящем сообщении.
   */
  emitNewMessage(conversationId: string, createdAt: Date) {
    this.events$.next({
      type: 'new-message',
      data: {
        type: 'new-message',
        conversationId,
        createdAt,
      },
    });
  }
}
