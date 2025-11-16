// Типы для недельного паттерна расписания

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface WeeklyScheduleItem {
  day: DayOfWeek;
  startTime: string; // Формат "HH:mm", например "18:00"
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Пн',
  TUE: 'Вт',
  WED: 'Ср',
  THU: 'Чт',
  FRI: 'Пт',
  SAT: 'Сб',
  SUN: 'Вс',
};

export const DAY_LABELS_FULL: Record<DayOfWeek, string> = {
  MON: 'Понедельник',
  TUE: 'Вторник',
  WED: 'Среда',
  THU: 'Четверг',
  FRI: 'Пятница',
  SAT: 'Суббота',
  SUN: 'Воскресенье',
};

export const DAYS_OF_WEEK: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Утилиты для работы с расписанием
export const calculateEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export const formatTimeRange = (startTime: string, duration: number): string => {
  const endTime = calculateEndTime(startTime, duration);
  return `${startTime}-${endTime}`;
};

export const formatWeeklySchedule = (schedule: WeeklyScheduleItem[], duration?: number): string => {
  if (!schedule || schedule.length === 0) return 'Не задано';

  const days = schedule.map(item => DAY_LABELS[item.day]).join(', ');
  const time = schedule[0]?.startTime || '';

  if (duration) {
    return `${days} ${formatTimeRange(time, duration)}`;
  }

  return `${days} ${time}`;
};
