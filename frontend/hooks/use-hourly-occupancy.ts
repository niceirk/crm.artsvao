'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { rentalApplicationsApi } from '@/lib/api/rental-applications';

/**
 * Hook для загрузки занятости почасовых слотов (оптимизированный)
 * Использует один батчевый запрос вместо множества отдельных
 * @param roomId ID помещения
 * @param dates Массив дат для проверки
 * @returns Объект с Set занятых слотов и статусом загрузки
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
        return new Set<string>();
      }

      // Один батчевый запрос вместо множества
      const occupiedMap = await rentalApplicationsApi.getHourlyOccupancy(roomId, dateStrings);

      // Преобразуем объект в Set для быстрого поиска
      const occupiedSlots = new Set<string>();
      for (const [slotKey, isOccupied] of Object.entries(occupiedMap)) {
        if (isOccupied) {
          occupiedSlots.add(slotKey);
        }
      }

      return occupiedSlots;
    },
    enabled: !!roomId && dates.length > 0,
    staleTime: 30 * 1000, // Данные считаются свежими 30 секунд
    gcTime: 2 * 60 * 1000, // Храним в памяти 2 минуты
    refetchOnWindowFocus: false, // Не обновлять при фокусе окна
  });

  return {
    occupiedSlots: query.data || new Set<string>(),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
