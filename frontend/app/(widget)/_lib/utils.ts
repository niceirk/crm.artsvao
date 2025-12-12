/**
 * Форматировать дату в русский формат
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Форматировать короткую дату (без года) с днём недели
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const shortDays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const dayOfWeek = shortDays[date.getDay()];
  const dateFormatted = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  return `${dayOfWeek}, ${dateFormatted}`;
}

/**
 * Форматировать время
 */
export function formatTime(time: string): string {
  return time.substring(0, 5);
}

/**
 * Получить название дня недели
 * Поддерживает как числовые значения (0-6), так и строковые (MON, TUE, ...)
 */
export function getDayName(day: number | string): string {
  const daysNum = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const daysStr: Record<string, string> = {
    'MON': 'Пн',
    'TUE': 'Вт',
    'WED': 'Ср',
    'THU': 'Чт',
    'FRI': 'Пт',
    'SAT': 'Сб',
    'SUN': 'Вс',
  };

  if (typeof day === 'number') {
    return daysNum[day] || '';
  }
  return daysStr[day] || '';
}

/**
 * Форматировать возрастной диапазон
 */
export function formatAge(ageMin: number | null, ageMax: number | null): string | null {
  if (ageMin === null && ageMax === null) return null;
  if (ageMin !== null && ageMax !== null) {
    return `${ageMin}-${ageMax} лет`;
  }
  if (ageMin !== null) {
    return `от ${ageMin} лет`;
  }
  if (ageMax !== null) {
    return `до ${ageMax} лет`;
  }
  return null;
}

/**
 * Проверить, являются ли две даты одним днём
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Получить полное название дня недели
 */
export function getDayOfWeek(date: Date): string {
  const days = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ];
  return days[date.getDay()];
}

/**
 * Форматировать заголовок дня для афиши
 * Возвращает: "Сегодня, 7 декабря" / "Завтра, 8 декабря" / "Понедельник, 9 декабря"
 */
export function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateFormatted = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  if (isSameDay(date, today)) {
    return `Сегодня, ${dateFormatted}`;
  }

  if (isSameDay(date, tomorrow)) {
    return `Завтра, ${dateFormatted}`;
  }

  return `${getDayOfWeek(date)}, ${dateFormatted}`;
}
