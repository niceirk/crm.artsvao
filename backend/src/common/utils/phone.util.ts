import { BadRequestException } from '@nestjs/common';

/**
 * Нормализует российский номер телефона к формату +7XXXXXXXXXX
 *
 * Поддерживаемые форматы:
 * - 8XXXXXXXXXX
 * - 7XXXXXXXXXX
 * - +7XXXXXXXXXX
 * - +7 (XXX) XXX-XX-XX
 * - 8 (XXX) XXX-XX-XX
 * - и другие варианты с пробелами, скобками, дефисами
 */
export function normalizePhone(phone: string): string {
  if (!phone) {
    throw new BadRequestException('Телефон не может быть пустым');
  }

  // Удаляем все символы кроме цифр и +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Проверка минимальной длины
  if (cleaned.length < 10) {
    throw new BadRequestException('Неверный формат телефона');
  }

  // Нормализация по различным форматам
  let normalized: string;

  if (cleaned.startsWith('+7')) {
    normalized = cleaned;
  } else if (cleaned.startsWith('8')) {
    normalized = '+7' + cleaned.substring(1);
  } else if (cleaned.startsWith('7')) {
    normalized = '+' + cleaned;
  } else if (cleaned.length === 10) {
    // Только 10 цифр без кода страны
    normalized = '+7' + cleaned;
  } else {
    throw new BadRequestException('Неверный формат российского телефона');
  }

  // Проверка итоговой длины (должно быть +7 и 10 цифр = 12 символов)
  if (normalized.length !== 12) {
    throw new BadRequestException('Неверная длина номера телефона');
  }

  // Проверка, что номер начинается с корректного кода оператора (4, 8, 9)
  const firstDigit = normalized.charAt(2);
  if (!['4', '8', '9'].includes(firstDigit)) {
    throw new BadRequestException(
      'Номер должен начинаться с 4, 8 или 9 после кода страны',
    );
  }

  return normalized;
}

/**
 * Валидирует российский номер телефона
 */
export function validatePhone(phone: string): boolean {
  try {
    normalizePhone(phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Форматирует номер для отображения: +7 (XXX) XXX-XX-XX
 */
export function formatPhoneDisplay(phone: string): string {
  try {
    const normalized = normalizePhone(phone);
    const digits = normalized.substring(2); // Убираем +7
    return `+7 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 8)}-${digits.substring(8, 10)}`;
  } catch {
    return phone;
  }
}
