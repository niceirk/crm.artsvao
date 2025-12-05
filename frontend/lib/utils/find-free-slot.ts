/**
 * Утилита для поиска свободного временного слота в помещении
 */

import { timeToMinutes, minutesToTime } from './time-slots';
import { CHESS_GRID } from './chess-grid';
import type { Activity } from '@/hooks/use-room-planner';

export interface FreeSlotResult {
  found: boolean;
  startTime: string;
  endTime: string;
  shifted: boolean;
  shiftDirection?: 'forward' | 'backward';
  shiftMinutes?: number;
}

/**
 * Ищет свободный слот для вставки события
 * Алгоритм:
 * 1. Проверяем исходное время
 * 2. Если занято - ищем вперед (вниз по времени)
 * 3. Если не нашли вперед - ищем назад (вверх)
 */
export function findFreeSlot(
  activities: Activity[],
  preferredStartTime: string,
  durationMinutes: number,
  excludeActivityId?: string
): FreeSlotResult {
  const gridStartMin = CHESS_GRID.START_HOUR * 60;
  const gridEndMin = CHESS_GRID.END_HOUR * 60;

  // Фильтруем отмененные и исключаемое событие
  const activeEvents = activities.filter(
    (a) => a.status !== 'CANCELLED' && a.id !== excludeActivityId
  );

  // Сортируем по времени начала
  const sortedEvents = [...activeEvents].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const preferredStartMin = timeToMinutes(preferredStartTime);
  const slotDuration = durationMinutes;

  // Функция проверки свободности слота
  const isSlotFree = (startMin: number): boolean => {
    const endMin = startMin + slotDuration;

    // Проверяем границы рабочего дня
    if (startMin < gridStartMin || endMin > gridEndMin) {
      return false;
    }

    // Проверяем пересечение с существующими событиями
    for (const event of sortedEvents) {
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);

      // Пересечение: новый слот начинается до конца события И заканчивается после начала
      if (startMin < eventEnd && startMin + slotDuration > eventStart) {
        return false;
      }
    }

    return true;
  };

  // 1. Проверяем исходное время
  if (isSlotFree(preferredStartMin)) {
    return {
      found: true,
      startTime: preferredStartTime,
      endTime: minutesToTime(preferredStartMin + slotDuration),
      shifted: false,
    };
  }

  // 2. Ищем вперед (вниз по времени) с шагом 30 минут
  for (
    let offset = CHESS_GRID.SLOT_DURATION;
    offset <= gridEndMin - gridStartMin;
    offset += CHESS_GRID.SLOT_DURATION
  ) {
    const candidateStart = preferredStartMin + offset;

    if (candidateStart + slotDuration > gridEndMin) break;

    if (isSlotFree(candidateStart)) {
      return {
        found: true,
        startTime: minutesToTime(candidateStart),
        endTime: minutesToTime(candidateStart + slotDuration),
        shifted: true,
        shiftDirection: 'forward',
        shiftMinutes: offset,
      };
    }
  }

  // 3. Ищем назад (вверх по времени)
  for (
    let offset = CHESS_GRID.SLOT_DURATION;
    offset <= gridEndMin - gridStartMin;
    offset += CHESS_GRID.SLOT_DURATION
  ) {
    const candidateStart = preferredStartMin - offset;

    if (candidateStart < gridStartMin) break;

    if (isSlotFree(candidateStart)) {
      return {
        found: true,
        startTime: minutesToTime(candidateStart),
        endTime: minutesToTime(candidateStart + slotDuration),
        shifted: true,
        shiftDirection: 'backward',
        shiftMinutes: offset,
      };
    }
  }

  // Не нашли свободный слот
  return {
    found: false,
    startTime: preferredStartTime,
    endTime: minutesToTime(preferredStartMin + slotDuration),
    shifted: false,
  };
}
