/**
 * Утилиты для проверки конфликтов при перемещении событий
 */

import type { Activity } from '@/hooks/use-room-planner';
import { timeToMinutes } from './time-slots';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingActivities: Activity[];
}

/**
 * Проверяет, пересекаются ли два временных интервала
 */
export function doTimeIntervalsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return s1 < e2 && e1 > s2;
}

/**
 * Проверяет конфликты при перемещении события в новую позицию
 *
 * @param activitiesByRoom - Map помещений и их событий
 * @param targetRoomId - ID целевого помещения
 * @param newStartTime - Новое время начала (HH:mm)
 * @param newEndTime - Новое время окончания (HH:mm)
 * @param excludeActivityId - ID перемещаемого события (исключить из проверки)
 */
export function checkActivityConflict(
  activitiesByRoom: Map<string, Activity[]>,
  targetRoomId: string,
  newStartTime: string,
  newEndTime: string,
  excludeActivityId: string
): ConflictCheckResult {
  const roomActivities = activitiesByRoom.get(targetRoomId) || [];

  const conflictingActivities = roomActivities.filter((activity) => {
    // Исключаем само перемещаемое событие
    if (activity.id === excludeActivityId) return false;

    // Отмененные события не создают конфликтов
    if (activity.status === 'CANCELLED') return false;

    // Проверяем пересечение временных интервалов
    return doTimeIntervalsOverlap(
      newStartTime,
      newEndTime,
      activity.startTime,
      activity.endTime
    );
  });

  return {
    hasConflict: conflictingActivities.length > 0,
    conflictingActivities,
  };
}

/**
 * Форматирует время конфликтующих событий для отображения пользователю
 */
export function formatConflictMessage(activities: Activity[]): string {
  return activities
    .map((a) => `${a.startTime}-${a.endTime}: ${a.title}`)
    .join('\n');
}
