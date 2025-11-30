import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { RecurringScheduleService } from './recurring-schedule.service';
import { BulkScheduleService } from './bulk-schedule.service';
import { SchedulePlannerService } from './schedule-planner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SharedModule, NotificationsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, RecurringScheduleService, BulkScheduleService, SchedulePlannerService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
