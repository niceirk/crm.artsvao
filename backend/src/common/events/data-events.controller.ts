import { Controller, Sse, Query, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DataEventsService, TrackedEntity } from './data-events.service';

/**
 * Контроллер для SSE подписки на изменения данных.
 * Позволяет frontend подписаться на изменения конкретных сущностей.
 */
@Controller('data-events')
export class DataEventsController {
  constructor(private readonly dataEventsService: DataEventsService) {}

  /**
   * SSE endpoint для подписки на изменения данных.
   *
   * @param entities - Список сущностей для отслеживания (через запятую)
   * @example GET /data-events/stream?entities=subscription,attendance,invoice
   */
  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(
    @Query('entities') entitiesParam?: string,
  ): Observable<MessageEvent> {
    const entities = entitiesParam
      ? (entitiesParam.split(',') as TrackedEntity[])
      : undefined;

    return this.dataEventsService.getFilteredStream(entities);
  }
}
