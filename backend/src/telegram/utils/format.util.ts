/**
 * Утилиты форматирования для Telegram бота
 */

/**
 * Вычислить возраст по дате рождения
 */
export function calculateAge(dateOfBirth: Date | null | undefined): number | null {
  if (!dateOfBirth) return null;

  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Склонение слова "лет"
 */
function getAgeDeclension(age: number): string {
  if (age % 10 === 1 && age % 100 !== 11) return 'год';
  if ([2, 3, 4].includes(age % 10) && ![12, 13, 14].includes(age % 100)) return 'года';
  return 'лет';
}

/**
 * Форматировать имя клиента: "Фамилия Имя, 38 лет"
 * Если возраст неизвестен: "Фамилия Имя"
 */
export function formatClientName(
  firstName: string | null,
  lastName: string | null,
  middleName?: string | null,
  dateOfBirth?: Date | null
): string {
  const name = [lastName, firstName].filter(Boolean).join(' ');

  const age = calculateAge(dateOfBirth);
  if (age !== null) {
    return `${name}, ${age} ${getAgeDeclension(age)}`;
  }

  return name;
}

/**
 * Экранировать специальные символы HTML
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Форматировать дату для отображения
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Форматировать время для отображения
 */
export function formatTime(date: Date): string {
  return date.toISOString().substr(11, 5);
}
