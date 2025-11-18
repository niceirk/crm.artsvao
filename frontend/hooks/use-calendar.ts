import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  getAllCalendarEvents,
  CalendarEventsResponse,
  CalendarFilters,
} from '@/lib/api/calendar';

/**
 * Хук для получения всех событий календаря одним запросом
 * Оптимизация: вместо 4 отдельных запросов делается 1
 */
export function useCalendarEvents(
  filters?: CalendarFilters
): UseQueryResult<CalendarEventsResponse, Error> {
  return useQuery({
    queryKey: ['calendar-events', filters],
    queryFn: () => getAllCalendarEvents(filters),
    staleTime: 30 * 1000, // 30 секунд - для realtime данных календаря
  });
}
