import { Module } from '@nestjs/common';
import { EventTypesService } from './event-types.service';
import { EventTypesController } from './event-types.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EventTypesController],
  providers: [EventTypesService],
  exports: [EventTypesService],
})
export class EventTypesModule {}
