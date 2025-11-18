import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { SchedulesModule } from '../schedules/schedules.module';
import { RentalsModule } from '../rentals/rentals.module';
import { EventsModule } from '../events/events.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    SchedulesModule,
    RentalsModule,
    EventsModule,
    ReservationsModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
