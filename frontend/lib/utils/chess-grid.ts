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
const DAY_NAMES_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTH_NAMES_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

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
 * Форматирование даты "Суббота, 30 ноября"
 */
export function formatDateFull(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const dayName = DAY_NAMES_FULL[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES_FULL[d.getMonth()];
  return `${dayName}, ${day} ${month}`;
}

/**
 * Форматирование диапазона недели "25 - 1 декабря" или "25 ноября - 1 декабря"
 */
export function formatWeekRange(startDate: string): string {
  const dates = getWeekDates(startDate);
  const start = new Date(dates[0] + 'T00:00:00');
  const end = new Date(dates[6] + 'T00:00:00');

  const startDay = start.getDate();
  const startMonth = MONTH_NAMES_FULL[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = MONTH_NAMES_FULL[end.getMonth()];

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
 * Оптимизировано: предвычисляем timeToMinutes для всех событий один раз
 */
export function layoutOverlappingEvents<T extends { id: string; startTime: string; endTime: string }>(
  events: T[]
): (T & { column: number; totalColumns: number })[] {
  if (events.length === 0) return [];

  // Предвычисляем время в минутах для всех событий (кэширование)
  const eventsWithTime = events.map(event => ({
    event,
    startMin: timeToMinutes(event.startTime),
    endMin: timeToMinutes(event.endTime),
  }));

  // Сортируем по времени начала
  eventsWithTime.sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    // При равном начале - более длинные события сначала
    return b.endMin - a.endMin;
  });

  // Результат с колонками
  const result: (T & { column: number; totalColumns: number })[] = [];

  // Группы пересекающихся событий
  type EventWithTime = typeof eventsWithTime[number];
  const groups: EventWithTime[][] = [];
  let currentGroup: EventWithTime[] = [];
  let groupEnd = 0;

  for (const item of eventsWithTime) {
    if (currentGroup.length === 0 || item.startMin < groupEnd) {
      // Добавляем в текущую группу
      currentGroup.push(item);
      groupEnd = Math.max(groupEnd, item.endMin);
    } else {
      // Начинаем новую группу
      groups.push(currentGroup);
      currentGroup = [item];
      groupEnd = item.endMin;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Для каждой группы назначаем колонки
  for (const group of groups) {
    // Храним только время окончания последнего события в каждой колонке
    const columnEndTimes: number[] = [];

    // Map для хранения назначенной колонки для каждого события
    const columnAssignments = new Map<EventWithTime, number>();

    for (const item of group) {
      // Ищем первую колонку, где событие не пересекается
      let assignedCol = -1;
      for (let col = 0; col < columnEndTimes.length; col++) {
        if (item.startMin >= columnEndTimes[col]) {
          columnEndTimes[col] = item.endMin;
          assignedCol = col;
          break;
        }
      }

      if (assignedCol === -1) {
        assignedCol = columnEndTimes.length;
        columnEndTimes.push(item.endMin);
      }

      columnAssignments.set(item, assignedCol);
    }

    // Записываем результат
    const totalColumns = columnEndTimes.length;
    for (const item of group) {
      result.push({
        ...item.event,
        column: columnAssignments.get(item)!,
        totalColumns,
      });
    }
  }

  return result;
}

// ==================== Drag-and-Drop утилиты ====================

/**
 * Интерфейс для результата расчета позиции при drop
 */
export interface DropPosition {
  startTime: string;
  endTime: string;
  rowIndex: number;
}

/**
 * Рассчитывает новое время события при drop на основе Y-координаты
 * Привязка к 30-минутным интервалам (00, 30)
 *
 * @param yOffset - смещение Y от верха области с событиями (в пикселях)
 * @param columnHeight - полная высота колонки (в пикселях)
 * @param eventDurationMinutes - длительность события в минутах
 * @param scale - масштаб отображения (по умолчанию 1.0)
 */
export function calculateDropPosition(
  yOffset: number,
  columnHeight: number,
  eventDurationMinutes: number,
  scale: number = 1.0
): DropPosition {
  const scaledRowHeight = CHESS_GRID.ROW_HEIGHT * scale;

  // Рассчитываем индекс строки (каждая строка = 30 минут)
  let rowIndex = Math.round(yOffset / scaledRowHeight);

  // Ограничиваем индекс строки допустимыми значениями
  rowIndex = Math.max(0, Math.min(rowIndex, TOTAL_ROWS - 1));

  // Рассчитываем время начала
  const startMinutes = CHESS_GRID.START_HOUR * 60 + rowIndex * CHESS_GRID.SLOT_DURATION;

  // Рассчитываем время окончания
  let endMinutes = startMinutes + eventDurationMinutes;

  // Ограничиваем время окончания рабочими часами
  const maxEndMinutes = CHESS_GRID.END_HOUR * 60;
  if (endMinutes > maxEndMinutes) {
    endMinutes = maxEndMinutes;
    // Сдвигаем начало назад, чтобы сохранить длительность (если возможно)
    const adjustedStart = endMinutes - eventDurationMinutes;
    if (adjustedStart >= CHESS_GRID.START_HOUR * 60) {
      return {
        startTime: minutesToTime(adjustedStart),
        endTime: minutesToTime(endMinutes),
        rowIndex: Math.floor((adjustedStart - CHESS_GRID.START_HOUR * 60) / CHESS_GRID.SLOT_DURATION),
      };
    }
  }

  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes),
    rowIndex,
  };
}

/**
 * Рассчитывает длительность события в минутах
 */
export function getEventDurationMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}
