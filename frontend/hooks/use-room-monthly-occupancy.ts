'use client';

import { useQuery } from '@tanstack/react-query';
import { rentalApplicationsApi } from '@/lib/api/rental-applications';

export interface RoomOccupancyInfo {
  type: string;
  description: string;
}

/**
 * Hook для загрузки занятости помещения по дням (для ROOM_MONTHLY коворкинга без мест)
 * @param roomId ID помещения
 * @param startDate Дата начала (yyyy-MM-dd)
 * @param endDate Дата окончания (yyyy-MM-dd)
 * @returns Map дата -> информация о занятости (или null если свободно)
 */
export function useRoomMonthlyOccupancy(
  roomId: string | null,
  startDate: string | null,
  endDate: string | null,
) {
  const query = useQuery({
    queryKey: ['room-monthly-occupancy', roomId, startDate, endDate],
    queryFn: async () => {
      if (!roomId || !startDate || !endDate) {
        return {};
      }

      return rentalApplicationsApi.getRoomMonthlyOccupancy(roomId, startDate, endDate);
    },
    enabled: !!roomId && !!startDate && !!endDate,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    occupancyMap: query.data || {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
