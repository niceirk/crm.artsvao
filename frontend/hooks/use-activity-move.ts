/**
 * Хук для перемещения событий (drag-and-drop) в шахматке
 * Объединяет обновление всех типов событий: schedule, rental, event, reservation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, type UpdateScheduleDto } from '@/lib/api/schedules';
import { rentalsApi, type UpdateRentalDto } from '@/lib/api/rentals';
import { eventsApi, type UpdateEventDto } from '@/lib/api/events';
import { reservationsApi, type UpdateReservationDto } from '@/lib/api/reservations';
import { toast } from '@/lib/utils/toast';
import type { ActivityType } from './use-room-planner';

export interface MoveActivityParams {
  activityId: string;
  type: ActivityType;
  newRoomId: string;
  newStartTime: string;
  newEndTime: string;
  /** Новая цена (только для rental при смене помещения) */
  newTotalPrice?: number;
}

interface MoveResult {
  success: boolean;
  error?: string;
}

/**
 * Хук для перемещения события в новую позицию
 */
export function useActivityMove() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: MoveActivityParams): Promise<MoveResult> => {
      const { activityId, type, newRoomId, newStartTime, newEndTime, newTotalPrice } = params;

      try {
        switch (type) {
          case 'schedule': {
            const data: UpdateScheduleDto = {
              roomId: newRoomId,
              startTime: newStartTime,
              endTime: newEndTime,
            };
            await schedulesApi.updateSchedule(activityId, data);
            break;
          }

          case 'rental': {
            const data: UpdateRentalDto = {
              roomId: newRoomId,
              startTime: newStartTime,
              endTime: newEndTime,
            };
            if (newTotalPrice !== undefined) {
              data.totalPrice = newTotalPrice;
            }
            await rentalsApi.updateRental(activityId, data);
            break;
          }

          case 'event': {
            const data: UpdateEventDto = {
              roomId: newRoomId,
              startTime: newStartTime,
              endTime: newEndTime,
            };
            await eventsApi.updateEvent(activityId, data);
            break;
          }

          case 'reservation': {
            const data: UpdateReservationDto = {
              roomId: newRoomId,
              startTime: newStartTime,
              endTime: newEndTime,
            };
            await reservationsApi.updateReservation(activityId, data);
            break;
          }

          default:
            throw new Error(`Неизвестный тип события: ${type}`);
        }

        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.message || 'Ошибка перемещения события';
        return { success: false, error: message };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        // Инвалидируем только calendar-events (они уже содержат все данные)
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-week-events'] });

        toast.success('Событие перемещено');
      } else {
        toast.error(result.error || 'Ошибка перемещения');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка перемещения события');
    },
  });

  return {
    moveActivity: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Рассчитывает новую цену аренды при смене помещения
 * @param hourlyRate - часовая ставка нового помещения
 * @param startTime - время начала (HH:mm)
 * @param endTime - время окончания (HH:mm)
 */
export function calculateRentalPrice(
  hourlyRate: number,
  startTime: string,
  endTime: string
): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const durationMinutes = endMinutes - startMinutes;

  // Округляем вверх до полного часа
  const hours = Math.ceil(durationMinutes / 60);

  return Math.round(hourlyRate * hours * 100) / 100;
}
