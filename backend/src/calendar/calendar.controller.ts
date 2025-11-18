import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * GET /calendar/all-events
   * Получить все события календаря одним запросом
   *
   * @param date - Дата для фильтрации (опционально)
   * @param roomId - ID комнаты для фильтрации (опционально)
   * @param teacherId - ID преподавателя для фильтрации (опционально)
   * @param groupId - ID группы для фильтрации (опционально)
   * @param status - Статус для фильтрации (опционально)
   * @param eventTypeId - ID типа события для фильтрации (опционально)
   *
   * @returns {Promise<CalendarResponse>} Объект с массивами schedules, rentals, events, reservations
   *
   * Оптимизация: Вместо 4 последовательных запросов с frontend,
   * делается 1 запрос на backend, который выполняет 4 запроса параллельно
   */
  @Get('all-events')
  getAllEvents(
    @Query('date') date?: string,
    @Query('roomId') roomId?: string | string[],
    @Query('teacherId') teacherId?: string | string[],
    @Query('groupId') groupId?: string | string[],
    @Query('status') status?: string,
    @Query('eventTypeId') eventTypeId?: string | string[],
  ) {
    return this.calendarService.getAllEvents({
      date,
      roomId,
      teacherId,
      groupId,
      status,
      eventTypeId,
    });
  }
}
