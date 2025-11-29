/**
 * Утилиты для работы с временными слотами в Room Planner
 */

export interface TimeSlot {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // В минутах
}

export interface ActivityTimeRange {
  startTime: string;
  endTime: string;
  status?: string;
}

/**
 * Преобразует время HH:mm в минуты от начала дня
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Преобразует минуты от начала дня в формат HH:mm
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Разница между двумя временами в минутах
 */
export function timeDiffInMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/**
 * Возвращает большее из двух времен
 */
export function maxTime(time1: string, time2: string): string {
  return timeToMinutes(time1) > timeToMinutes(time2) ? time1 : time2;
}

/**
 * Возвращает меньшее из двух времен
 */
export function minTime(time1: string, time2: string): string {
  return timeToMinutes(time1) < timeToMinutes(time2) ? time1 : time2;
}

/**
 * Объединяет пересекающиеся временные интервалы
 */
export function mergeOverlappingIntervals(
  activities: ActivityTimeRange[]
): ActivityTimeRange[] {
  if (activities.length === 0) return [];

  // Сортируем по времени начала
  const sorted = [...activities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const merged: ActivityTimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Если интервалы пересекаются или соприкасаются
    if (timeToMinutes(current.startTime) <= timeToMinutes(last.endTime)) {
      // Объединяем - берем максимальное время окончания
      last.endTime = maxTime(last.endTime, current.endTime);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Рассчитывает свободные временные слоты между занятыми интервалами
 * @param activities - список активностей
 * @param workingHoursStart - начало рабочего дня
 * @param workingHoursEnd - конец рабочего дня
 * @param minSlotDuration - минимальная длительность слота в минутах
 * @param currentTimeIfToday - текущее время (если сегодня), для фильтрации прошедших слотов
 */
export function calculateFreeSlots(
  activities: ActivityTimeRange[],
  workingHoursStart: string = '08:00',
  workingHoursEnd: string = '22:00',
  minSlotDuration: number = 30,
  currentTimeIfToday?: string
): TimeSlot[] {
  // Фильтруем отмененные активности
  const activeActivities = activities.filter(
    (a) => a.status !== 'CANCELLED'
  );

  // Определяем начальное время (с учётом текущего времени для сегодня)
  let effectiveStart = workingHoursStart;
  if (currentTimeIfToday) {
    // Округляем текущее время вверх до ближайших 30 минут
    const currentMinutes = timeToMinutes(currentTimeIfToday);
    const roundedMinutes = Math.ceil(currentMinutes / 30) * 30;
    const roundedTime = minutesToTime(roundedMinutes);
    effectiveStart = maxTime(workingHoursStart, roundedTime);
  }

  // Если эффективное начало >= конец рабочего дня - слотов нет
  if (timeToMinutes(effectiveStart) >= timeToMinutes(workingHoursEnd)) {
    return [];
  }

  if (activeActivities.length === 0) {
    const duration = timeDiffInMinutes(effectiveStart, workingHoursEnd);
    if (duration >= minSlotDuration) {
      return [{
        startTime: effectiveStart,
        endTime: workingHoursEnd,
        duration,
      }];
    }
    return [];
  }

  // Объединяем пересекающиеся интервалы
  const mergedIntervals = mergeOverlappingIntervals(activeActivities);

  const freeSlots: TimeSlot[] = [];
  let currentTime = effectiveStart;

  for (const interval of mergedIntervals) {
    // Пропускаем интервалы, которые закончились до effectiveStart
    if (timeToMinutes(interval.endTime) <= timeToMinutes(effectiveStart)) {
      continue;
    }

    // Если текущее время меньше начала интервала - есть свободный слот
    if (timeToMinutes(currentTime) < timeToMinutes(interval.startTime)) {
      const slotStart = maxTime(currentTime, effectiveStart);
      const slotEnd = minTime(interval.startTime, workingHoursEnd);

      if (timeToMinutes(slotStart) < timeToMinutes(slotEnd)) {
        const duration = timeDiffInMinutes(slotStart, slotEnd);

        if (duration >= minSlotDuration) {
          freeSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            duration,
          });
        }
      }
    }

    // Обновляем текущее время
    currentTime = maxTime(currentTime, interval.endTime);
  }

  // Проверяем время после последней активности
  if (timeToMinutes(currentTime) < timeToMinutes(workingHoursEnd)) {
    const slotStart = maxTime(currentTime, effectiveStart);
    if (timeToMinutes(slotStart) < timeToMinutes(workingHoursEnd)) {
      const duration = timeDiffInMinutes(slotStart, workingHoursEnd);

      if (duration >= minSlotDuration) {
        freeSlots.push({
          startTime: slotStart,
          endTime: workingHoursEnd,
          duration,
        });
      }
    }
  }

  return freeSlots;
}

/**
 * Проверяет, попадает ли время в заданный интервал
 */
export function isTimeInInterval(
  time: string,
  startTime: string,
  endTime: string
): boolean {
  const t = timeToMinutes(time);
  return t >= timeToMinutes(startTime) && t < timeToMinutes(endTime);
}

/**
 * Получает текущее время в формате HH:mm
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Получает текущую дату в формате YYYY-MM-DD
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Проверяет, активна ли активность прямо сейчас
 */
export function isActivityCurrentlyActive(
  activityDate: string,
  startTime: string,
  endTime: string,
  currentDate?: string
): boolean {
  const today = currentDate || getCurrentDate();
  const date = activityDate.split('T')[0];

  if (date !== today) return false;

  const currentTime = getCurrentTime();
  return isTimeInInterval(currentTime, startTime, endTime);
}

/**
 * Проверяет, попадает ли слот в заданный временной интервал поиска
 */
export function isSlotInInterval(
  slot: TimeSlot,
  searchStart: string,
  searchEnd: string,
  minDuration?: number
): boolean {
  // Проверяем, что слот пересекается с интервалом поиска
  const slotStartMin = timeToMinutes(slot.startTime);
  const slotEndMin = timeToMinutes(slot.endTime);
  const searchStartMin = timeToMinutes(searchStart);
  const searchEndMin = timeToMinutes(searchEnd);

  // Находим пересечение
  const overlapStart = Math.max(slotStartMin, searchStartMin);
  const overlapEnd = Math.min(slotEndMin, searchEndMin);

  if (overlapStart >= overlapEnd) return false;

  // Если указана минимальная длительность, проверяем
  if (minDuration) {
    const overlapDuration = overlapEnd - overlapStart;
    if (overlapDuration < minDuration) return false;
  }

  return true;
}

/**
 * Форматирует длительность в человекочитаемый формат
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${mins} мин`;
}

/**
 * Форматирует временной слот
 */
export function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.startTime} - ${slot.endTime}`;
}

/**
 * Парсит время из различных форматов в HH:mm
 * Поддерживает: ISO (1970-01-01T10:00:00.000Z), HH:mm, HH:mm:ss
 */
export function parseTimeToHHmm(time: string): string {
  if (!time) return '00:00';

  // Если уже в формате HH:mm
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  // Если ISO формат (содержит T)
  if (time.includes('T')) {
    const date = new Date(time);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Если HH:mm:ss формат
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time.slice(0, 5);
  }

  return time;
}
