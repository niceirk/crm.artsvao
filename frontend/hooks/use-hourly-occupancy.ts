'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { rentalApplicationsApi } from '@/lib/api/rental-applications';
import type { OccupiedInterval } from '@/lib/types/rental-applications';

/**
 * Hook для загрузки занятости почасовых слотов (оптимизированный)
 * Использует один батчевый запрос вместо множества отдельных
 * @param roomId ID помещения
 * @param dates Массив дат для проверки
 * @returns Объект с Set занятых слотов, детальными интервалами и статусом загрузки
 */
export function useHourlyOccupancy(roomId: string, dates: Date[]) {
  // Сортируем и форматируем даты для стабильного queryKey
  const dateStrings = useMemo(() => {
    return dates
      .map(d => format(d, 'yyyy-MM-dd'))
      .sort();
  }, [dates]);

  const query = useQuery({
    queryKey: ['hourly-occupancy', roomId, dateStrings],
    queryFn: async () => {
      if (!roomId || dateStrings.length === 0) {
        return {
          occupiedSlots: new Set<string>(),
          occupiedIntervals: new Map<string, OccupiedInterval[]>(),
        };
      }

      // Один батчевый запрос вместо множества
      const response = await rentalApplicationsApi.getHourlyOccupancy(roomId, dateStrings);

      // Преобразуем объект в Set для быстрого поиска
      const occupiedSlots = new Set<string>();
      if (response.slots) {
        for (const [slotKey, value] of Object.entries(response.slots)) {
          if (value === true) {
            occupiedSlots.add(slotKey);
          }
        }
      }

      // Преобразуем detailed в Map для быстрого доступа
      const occupiedIntervals = new Map<string, OccupiedInterval[]>();
      if (response.detailed) {
        for (const [dateStr, intervals] of Object.entries(response.detailed)) {
          occupiedIntervals.set(dateStr, intervals);
        }
      }

      return { occupiedSlots, occupiedIntervals };
    },
    enabled: !!roomId && dates.length > 0,
    staleTime: 30 * 1000, // Данные считаются свежими 30 секунд
    gcTime: 2 * 60 * 1000, // Храним в памяти 2 минуты
    refetchOnWindowFocus: false, // Не обновлять при фокусе окна
  });

  return {
    occupiedSlots: query.data?.occupiedSlots || new Set<string>(),
    occupiedIntervals: query.data?.occupiedIntervals || new Map<string, OccupiedInterval[]>(),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
