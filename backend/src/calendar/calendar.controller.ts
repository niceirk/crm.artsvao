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

  /**
   * GET /calendar/week-events
   * Получить все события за диапазон дат ОДНИМ запросом
   *
   * Оптимизация для недельного режима шахматки:
   * - Вместо 7 параллельных HTTP запросов (по одному на день)
   * - Делается 1 запрос с диапазоном дат
   * - Backend выполняет 4 SQL запроса вместо 28
   *
   * @param startDate - Начало диапазона (ISO date string)
   * @param endDate - Конец диапазона (ISO date string)
   * @param roomId - ID комнаты для фильтрации (опционально)
   */
  @Get('week-events')
  getWeekEvents(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('roomId') roomId?: string | string[],
  ) {
    return this.calendarService.getWeekEvents({
      startDate,
      endDate,
      roomId,
    });
  }
}
