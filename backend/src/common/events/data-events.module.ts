import { Global, Module } from '@nestjs/common';
import { DataEventsService } from './data-events.service';
import { DataEventsController } from './data-events.controller';

/**
 * Глобальный модуль для системы событий изменения данных.
 * Экспортирует DataEventsService для использования в других модулях.
 */
@Global()
@Module({
  controllers: [DataEventsController],
  providers: [DataEventsService],
  exports: [DataEventsService],
})
export class DataEventsModule {}
