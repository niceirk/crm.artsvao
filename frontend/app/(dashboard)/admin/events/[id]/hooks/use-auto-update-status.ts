import { useEffect, useRef } from 'react';
import { Event, CalendarEventStatus } from '@/lib/api/events';
import { useUpdateEvent } from '@/hooks/use-events';

/**
 * Hook для автоматического обновления статуса мероприятия
 * на основе текущего времени
 */
export function useAutoUpdateStatus(event: Event) {
  const updateEvent = useUpdateEvent();
  const hasUpdatedRef = useRef<Record<CalendarEventStatus, boolean>>({
    PLANNED: false,
    ONGOING: false,
    COMPLETED: false,
    CANCELLED: false,
  });

  useEffect(() => {
    const checkAndUpdateStatus = async () => {
      const now = new Date();

      // Парсим дату и время события
      const eventDate = new Date(event.date);
      const [startHours, startMinutes] = event.startTime.split(':').map(Number);
      const [endHours, endMinutes] = event.endTime.split(':').map(Number);

      const eventStart = new Date(eventDate);
      eventStart.setHours(startHours, startMinutes, 0, 0);

      const eventEnd = new Date(eventDate);
      eventEnd.setHours(endHours, endMinutes, 0, 0);

      let newStatus: CalendarEventStatus | null = null;

      // Определяем новый статус на основе времени
      if (event.status === 'PLANNED' && now >= eventStart && now < eventEnd) {
        newStatus = 'ONGOING';
      } else if (
        (event.status === 'PLANNED' || event.status === 'ONGOING') &&
        now >= eventEnd
      ) {
        newStatus = 'COMPLETED';
      }

      // Обновляем статус только если он изменился и мы еще не обновляли до этого статуса
      if (newStatus && newStatus !== event.status && !hasUpdatedRef.current[newStatus]) {
        try {
          await updateEvent.mutateAsync({
            id: event.id,
            data: { status: newStatus, version: event.version },
          });
          hasUpdatedRef.current[newStatus] = true;
          console.log(`Auto-updated event status from ${event.status} to ${newStatus}`);
        } catch (error) {
          console.error('Failed to auto-update event status:', error);
        }
      }
    };

    // Проверяем сразу при загрузке
    checkAndUpdateStatus();

    // Проверяем каждую минуту
    const interval = setInterval(checkAndUpdateStatus, 60000);

    return () => clearInterval(interval);
  }, [event, updateEvent]);
}
