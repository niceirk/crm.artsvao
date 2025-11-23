import { Module } from '@nestjs/common';
import { MessagesEventsService } from './messages-events.service';

@Module({
  providers: [MessagesEventsService],
  exports: [MessagesEventsService],
})
export class MessagesEventsModule {}
