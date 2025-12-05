import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActivityClipboardStore } from '@/lib/stores/activity-clipboard-store';
import { rentalApplicationsApi } from '@/lib/api/rental-applications';
import { reservationsApi } from '@/lib/api/reservations';
import { findFreeSlot } from '@/lib/utils/find-free-slot';
import { getEventDurationMinutes } from '@/lib/utils/chess-grid';
import { toast } from 'sonner';
import type { Activity } from '@/hooks/use-room-planner';
import type { Rental } from '@/lib/api/rentals';
import type { Reservation } from '@/lib/api/reservations';

interface PasteActivityParams {
  targetRoomId: string;
  targetDate: string;
  preferredStartTime: string;
  roomActivities: Activity[];
  roomHourlyRate?: number;
}

interface PasteResult {
  success: boolean;
  shifted: boolean;
  shiftDirection?: 'forward' | 'backward';
  shiftMinutes?: number;
  error?: string;
}

export function useActivityPaste() {
  const queryClient = useQueryClient();
  const clipboard = useActivityClipboardStore((state) => state.clipboard);

  const mutation = useMutation({
    mutationFn: async (params: PasteActivityParams): Promise<PasteResult> => {
      if (!clipboard) {
        return { success: false, shifted: false, error: 'Буфер обмена пуст' };
      }

      const { activity } = clipboard;
      const {
        targetRoomId,
        targetDate,
        preferredStartTime,
        roomActivities,
        roomHourlyRate,
      } = params;

      // Вычисляем длительность события
      const durationMinutes = getEventDurationMinutes(
        activity.startTime,
        activity.endTime
      );

      // Ищем свободный слот
      const freeSlot = findFreeSlot(
        roomActivities,
        preferredStartTime,
        durationMinutes
      );

      if (!freeSlot.found) {
        return {
          success: false,
          shifted: false,
          error: 'Не найден свободный слот в этом помещении',
        };
      }

      try {
        if (activity.type === 'rental') {
          const originalRental = activity.originalData as Rental;

          // Получаем clientId из rentalApplication
          const clientId = originalRental.rentalApplication?.client?.id;

          if (!clientId) {
            return {
              success: false,
              shifted: freeSlot.shifted,
              error:
                'Невозможно скопировать: клиент не привязан к бронированию. Используйте бронирование с заявкой.',
            };
          }

          // Расчет цены (Decimal из Prisma сериализуется в строку, нужно преобразовать)
          const hours = Math.ceil(durationMinutes / 60) || 1;
          const hourlyRate = roomHourlyRate ? Number(roomHourlyRate) : 0;
          const rentalPrice = originalRental.totalPrice ? Number(originalRental.totalPrice) : 0;
          const basePrice = hourlyRate || (rentalPrice / hours) || 0;

          await rentalApplicationsApi.create({
            rentalType: 'HOURLY',
            roomId: targetRoomId,
            clientId,
            periodType: 'HOURLY',
            startDate: targetDate,
            startTime: freeSlot.startTime,
            endTime: freeSlot.endTime,
            basePrice,
            priceUnit: 'HOUR',
            quantity: hours,
            eventType: originalRental.eventType || 'Аренда (копия)',
            notes: `Копия события от ${activity.date}`,
            ignoreConflicts: true, // Мы уже проверили конфликты
          });
        } else if (activity.type === 'reservation') {
          const originalReservation = activity.originalData as Reservation;

          await reservationsApi.createReservation({
            roomId: targetRoomId,
            date: targetDate,
            startTime: freeSlot.startTime,
            endTime: freeSlot.endTime,
            reservedBy: originalReservation.reservedBy,
            notes: originalReservation.notes
              ? `${originalReservation.notes} (копия от ${activity.date})`
              : `Копия от ${activity.date}`,
          });
        }

        return {
          success: true,
          shifted: freeSlot.shifted,
          shiftDirection: freeSlot.shiftDirection,
          shiftMinutes: freeSlot.shiftMinutes,
        };
      } catch (error: any) {
        return {
          success: false,
          shifted: freeSlot.shifted,
          error:
            error.response?.data?.message ||
            error.message ||
            'Ошибка создания события',
        };
      }
    },

    onSuccess: (result) => {
      if (result.success) {
        // Инвалидируем только calendar-events (они уже содержат все данные)
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-week-events'] });

        if (result.shifted) {
          const direction =
            result.shiftDirection === 'forward' ? 'вперёд' : 'назад';
          toast.success(
            `Событие вставлено (сдвинуто ${direction} на ${result.shiftMinutes} мин)`
          );
        } else {
          toast.success('Событие вставлено');
        }
      } else {
        toast.error(result.error || 'Ошибка вставки события');
      }
    },

    onError: (error: any) => {
      toast.error(error.message || 'Ошибка вставки события');
    },
  });

  return {
    pasteActivity: mutation.mutateAsync,
    isPasting: mutation.isPending,
    clipboard,
    hasClipboard: !!clipboard,
  };
}
