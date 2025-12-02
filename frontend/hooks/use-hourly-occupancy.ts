'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { rentalApplicationsApi } from '@/lib/api/rental-applications';

/**
 * Hook для загрузки занятости почасовых слотов
 * @param roomId ID помещения
 * @param dates Массив дат для проверки
 * @returns Объект с Set занятых слотов и статусом загрузки
 */
export function useHourlyOccupancy(roomId: string, dates: Date[]) {
  const query = useQuery({
    queryKey: ['hourly-occupancy', roomId, dates.map(d => format(d, 'yyyy-MM-dd'))],
    queryFn: async () => {
      const occupiedSlots = new Set<string>();

      // Проверяем каждый час для каждого дня
      for (const date of dates) {
        const dateStr = format(date, 'yyyy-MM-dd');

        // Часовые слоты от 9:00 до 21:00 (13 слотов)
        for (let hour = 9; hour <= 21; hour++) {
          const startTime = `${hour.toString().padStart(2, '0')}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

          try {
            const availability = await rentalApplicationsApi.checkAvailability({
              rentalType: 'HOURLY',
              roomId,
              periodType: 'HOURLY',
              startDate: dateStr,
              startTime,
              endTime,
            });

            // Если не available, значит слот занят
            if (!availability.available) {
              const slotKey = `${dateStr}_${hour}`;
              occupiedSlots.add(slotKey);
            }
          } catch (error) {
            console.error(`Error checking availability for ${dateStr} ${startTime}:`, error);
            // В случае ошибки считаем слот свободным
          }
        }
      }

      return occupiedSlots;
    },
    enabled: !!roomId && dates.length > 0,
    staleTime: 2 * 60 * 1000, // Кеш на 2 минуты
    gcTime: 5 * 60 * 1000, // Храним в памяти 5 минут
  });

  return {
    occupiedSlots: query.data || new Set<string>(),
    isLoading: query.isLoading,
  };
}
