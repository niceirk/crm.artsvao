/**
 * Утилиты для режима "Шахматка" в Room Planner
 */

import { timeToMinutes, minutesToTime, getCurrentTime, getCurrentDate } from './time-slots';

// Константы сетки
export const CHESS_GRID = {
  START_HOUR: 8,
  END_HOUR: 22,
  SLOT_DURATION: 30, // минут
  ROW_HEIGHT: 48, // пикселей
} as const;

// Количество строк в сетке
export const TOTAL_ROWS = (CHESS_GRID.END_HOUR - CHESS_GRID.START_HOUR) * 60 / CHESS_GRID.SLOT_DURATION; // 28

/**
 * Генерация массива временных слотов для отображения
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = CHESS_GRID.START_HOUR; h < CHESS_GRID.END_HOUR; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

/**
 * Интерфейс для позиции карточки активности
 */
export interface ActivityPosition {
  top: number;
  height: number;
  rowStart: number;
  rowSpan: number;
}

/**
 * Расчет позиции и высоты карточки активности
 */
export function getActivityPosition(startTime: string, endTime: string): ActivityPosition {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const gridStartMinutes = CHESS_GRID.START_HOUR * 60;
  const gridEndMinutes = CHESS_GRID.END_HOUR * 60;

  // Ограничиваем время в пределах рабочих часов
  const effectiveStart = Math.max(startMinutes, gridStartMinutes);
  const effectiveEnd = Math.min(endMinutes, gridEndMinutes);

  const rowStart = Math.floor((effectiveStart - gridStartMinutes) / CHESS_GRID.SLOT_DURATION);
  const rowSpan = Math.ceil((effectiveEnd - effectiveStart) / CHESS_GRID.SLOT_DURATION);

  const top = rowStart * CHESS_GRID.ROW_HEIGHT;
  const height = rowSpan * CHESS_GRID.ROW_HEIGHT;

  return { top, height, rowStart, rowSpan };
}

/**
 * Получение времени из индекса строки
 */
export function getTimeFromRowIndex(rowIndex: number): { startTime: string; endTime: string } {
  const minutes = CHESS_GRID.START_HOUR * 60 + rowIndex * CHESS_GRID.SLOT_DURATION;
  const startTime = minutesToTime(minutes);
  const endTime = minutesToTime(minutes + CHESS_GRID.SLOT_DURATION);
  return { startTime, endTime };
}

/**
 * Получение позиции линии текущего времени
 * @returns позиция в пикселях или null если время вне рабочих часов
 */
export function getCurrentTimePosition(): number | null {
  const currentTime = getCurrentTime();
  const currentMinutes = timeToMinutes(currentTime);
  const gridStartMinutes = CHESS_GRID.START_HOUR * 60;
  const gridEndMinutes = CHESS_GRID.END_HOUR * 60;

  // Если время вне рабочих часов
  if (currentMinutes < gridStartMinutes || currentMinutes > gridEndMinutes) {
    return null;
  }

  // Рассчитываем позицию в пикселях
  const minutesFromStart = currentMinutes - gridStartMinutes;
  const totalMinutes = gridEndMinutes - gridStartMinutes;
  const totalHeight = TOTAL_ROWS * CHESS_GRID.ROW_HEIGHT;

  return (minutesFromStart / totalMinutes) * totalHeight;
}

/**
 * Проверка, является ли выбранная дата сегодняшней
 */
export function isToday(date: string): boolean {
  return date === getCurrentDate();
}

/**
 * Проверка, попадает ли время в рабочие часы
 */
export function isTimeInWorkingHours(time: string): boolean {
  const minutes = timeToMinutes(time);
  const gridStartMinutes = CHESS_GRID.START_HOUR * 60;
  const gridEndMinutes = CHESS_GRID.END_HOUR * 60;
  return minutes >= gridStartMinutes && minutes <= gridEndMinutes;
}

/**
 * Форматирование времени для отображения (без :00 для целых часов)
 */
export function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(':');
  if (minutes === '00') {
    return `${parseInt(hours)}:00`;
  }
  return time;
}

// ==================== Утилиты для недельного режима ====================

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/**
 * Форматирование даты в YYYY-MM-DD без проблем с временными зонами
 */
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Получить понедельник недели для указанной даты
 */
export function getWeekStart(date: string): string {
  const d = new Date(date + 'T12:00:00'); // Используем полдень чтобы избежать проблем с DST
  const day = d.getDay();
  // В JS воскресенье = 0, понедельник = 1
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatLocalDate(d);
}

/**
 * Получить массив 7 дат недели начиная с понедельника
 */
export function getWeekDates(startDate: string): string[] {
  const monday = getWeekStart(startDate);
  const dates: string[] = [];
  const d = new Date(monday + 'T12:00:00');

  for (let i = 0; i < 7; i++) {
    dates.push(formatLocalDate(d));
    d.setDate(d.getDate() + 1);
  }

  return dates;
}

/**
 * Название дня недели (Пн, Вт...)
 */
export function getDayName(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
}

/**
 * Число месяца
 */
export function getDayNumber(date: string): number {
  const d = new Date(date + 'T00:00:00');
  return d.getDate();
}

/**
 * Форматирование диапазона недели "25 ноя - 1 дек"
 */
export function formatWeekRange(startDate: string): string {
  const dates = getWeekDates(startDate);
  const start = new Date(dates[0] + 'T00:00:00');
  const end = new Date(dates[6] + 'T00:00:00');

  const startDay = start.getDate();
  const startMonth = MONTH_NAMES[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = MONTH_NAMES[end.getMonth()];

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} - ${endDay} ${endMonth}`;
  }

  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

/**
 * Проверка, содержит ли неделя текущий день
 */
export function isCurrentWeek(startDate: string): boolean {
  const dates = getWeekDates(startDate);
  const today = getCurrentDate();
  return dates.includes(today);
}

// ==================== Алгоритм расположения пересекающихся событий ====================

export interface EventWithLayout {
  id: string;
  startTime: string;
  endTime: string;
  column: number;
  totalColumns: number;
}

/**
 * Расчет расположения пересекающихся событий
 * События делят ширину колонки, если пересекаются по времени
 */
export function layoutOverlappingEvents<T extends { id: string; startTime: string; endTime: string }>(
  events: T[]
): (T & { column: number; totalColumns: number })[] {
  if (events.length === 0) return [];

  // Сортируем по времени начала
  const sorted = [...events].sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    // При равном начале - более длинные события сначала
    return timeToMinutes(b.endTime) - timeToMinutes(a.endTime);
  });

  // Результат с колонками
  const result: (T & { column: number; totalColumns: number })[] = [];

  // Группы пересекающихся событий
  const groups: T[][] = [];
  let currentGroup: T[] = [];
  let groupEnd = 0;

  for (const event of sorted) {
    const eventStart = timeToMinutes(event.startTime);
    const eventEnd = timeToMinutes(event.endTime);

    if (currentGroup.length === 0 || eventStart < groupEnd) {
      // Добавляем в текущую группу
      currentGroup.push(event);
      groupEnd = Math.max(groupEnd, eventEnd);
    } else {
      // Начинаем новую группу
      groups.push(currentGroup);
      currentGroup = [event];
      groupEnd = eventEnd;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Для каждой группы назначаем колонки
  for (const group of groups) {
    const columns: T[][] = [];

    for (const event of group) {
      const eventStart = timeToMinutes(event.startTime);

      // Ищем первую колонку, где событие не пересекается
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastInColumn = columns[col][columns[col].length - 1];
        const lastEnd = timeToMinutes(lastInColumn.endTime);

        if (eventStart >= lastEnd) {
          columns[col].push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
      }
    }

    // Записываем результат
    const totalColumns = columns.length;
    for (let col = 0; col < columns.length; col++) {
      for (const event of columns[col]) {
        result.push({
          ...event,
          column: col,
          totalColumns,
        });
      }
    }
  }

  return result;
}
