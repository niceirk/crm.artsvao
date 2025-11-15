import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
