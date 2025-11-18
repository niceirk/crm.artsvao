import { Injectable } from '@nestjs/common';
import { SchedulesService } from '../schedules/schedules.service';
import { RentalsService } from '../rentals/rentals.service';
import { EventsService } from '../events/events.service';
import { ReservationsService } from '../reservations/reservations.service';

export interface CalendarFilters {
  date?: string;
  roomId?: string | string[];
  teacherId?: string | string[];
  groupId?: string | string[];
  status?: string;
  eventTypeId?: string | string[];
}

export interface CalendarResponse {
  schedules: any[];
  rentals: any[];
  events: any[];
  reservations: any[];
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly rentalsService: RentalsService,
    private readonly eventsService: EventsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  /**
   * Получить все события календаря одним запросом
   * Оптимизировано: 4 параллельных запроса вместо последовательных
   */
  async getAllEvents(filters: CalendarFilters): Promise<CalendarResponse> {
    // Выполняем все 4 запроса параллельно
    const [schedules, rentals, events, reservations] = await Promise.all([
      this.schedulesService.findAll({
        date: filters.date,
        roomId: filters.roomId,
        teacherId: filters.teacherId,
        groupId: filters.groupId,
      }),
      this.rentalsService.findAll({
        date: filters.date,
        roomId: filters.roomId,
        status: filters.status,
      }),
      this.eventsService.findAll({
        date: filters.date,
        status: filters.status,
        eventTypeId: filters.eventTypeId,
      }),
      this.reservationsService.findAll({
        date: filters.date,
        roomId: filters.roomId,
        status: filters.status,
      }),
    ]);

    return {
      schedules,
      rentals,
      events,
      reservations,
    };
  }
}
