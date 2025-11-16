import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { RecurringScheduleService } from './recurring-schedule.service';
import { BulkScheduleService } from './bulk-schedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, RecurringScheduleService, BulkScheduleService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
