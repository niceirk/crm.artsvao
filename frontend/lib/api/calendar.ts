import { apiClient } from './client';
import type { Schedule, ScheduleFilters } from './schedules';
import type { Rental } from './rentals';
import type { Event } from './events';
import type { Reservation } from './reservations';

export interface CalendarFilters extends ScheduleFilters {
  status?: string;
}

export interface CalendarEventsResponse {
  schedules: Schedule[];
  rentals: Rental[];
  events: Event[];
  reservations: Reservation[];
}

/**
 * Получить все события календаря одним запросом (оптимизировано)
 * Вместо 4 отдельных запросов делается 1 запрос, который на backend выполняется параллельно
 */
export async function getAllCalendarEvents(filters?: CalendarFilters): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams();

  if (filters?.date) params.append('date', filters.date);

  // Handle array or single value for filters
  if (filters?.roomId) {
    if (Array.isArray(filters.roomId)) {
      filters.roomId.forEach(id => params.append('roomId', id));
    } else {
      params.append('roomId', filters.roomId);
    }
  }

  if (filters?.teacherId) {
    if (Array.isArray(filters.teacherId)) {
      filters.teacherId.forEach(id => params.append('teacherId', id));
    } else {
      params.append('teacherId', filters.teacherId);
    }
  }

  if (filters?.groupId) {
    if (Array.isArray(filters.groupId)) {
      filters.groupId.forEach(id => params.append('groupId', id));
    } else {
      params.append('groupId', filters.groupId);
    }
  }

  if (filters?.eventTypeId) {
    if (Array.isArray(filters.eventTypeId)) {
      filters.eventTypeId.forEach(id => params.append('eventTypeId', id));
    } else {
      params.append('eventTypeId', filters.eventTypeId);
    }
  }

  if (filters?.status) params.append('status', filters.status);

  const queryString = params.toString();
  const url = `/calendar/all-events${queryString ? `?${queryString}` : ''}`;

  const { data } = await apiClient.get<CalendarEventsResponse>(url);
  return data;
}

/**
 * Получить все события за диапазон дат ОДНИМ запросом
 * Оптимизация для недельного режима шахматки:
 * - 1 HTTP запрос вместо 7
 * - 4 SQL запроса на backend вместо 28
 */
export async function getWeekCalendarEvents(
  startDate: string,
  endDate: string,
  roomIds?: string[]
): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams();
  params.append('startDate', startDate);
  params.append('endDate', endDate);

  if (roomIds && roomIds.length > 0) {
    roomIds.forEach(id => params.append('roomId', id));
  }

  const url = `/calendar/week-events?${params.toString()}`;
  const { data } = await apiClient.get<CalendarEventsResponse>(url);
  return data;
}
