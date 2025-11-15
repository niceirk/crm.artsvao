import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
