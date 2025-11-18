import { parsePhoneNumber as parsePhoneNumberLib, CountryCode } from 'libphonenumber-js'

/**
 * Форматирует номер телефона для отображения
 * Поддерживает международные номера
 * @param phone - номер телефона в любом формате
 * @returns отформатированный номер телефона
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  try {
    // Пытаемся распарсить как международный номер
    const phoneNumber = parsePhoneNumberLib(phone)

    if (phoneNumber && phoneNumber.isValid()) {
      // Возвращаем в международном формате
      return phoneNumber.formatInternational()
    }
  } catch (error) {
    // Если парсинг не удался, пробуем старый способ для российских номеров
  }

  // Fallback для российских номеров (старая логика)
  const cleaned = phone.replace(/\D/g, '');
  const normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
  const match = normalized.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/);

  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
  }

  // Если номер не подходит ни под один формат, возвращаем как есть
  return phone;
}

/**
 * Очищает номер телефона от маски для отправки на сервер
 * Нормализует номер в формат E.164 (+XXXXXXXXXXXX)
 * @param phone - номер телефона с маской
 * @returns номер телефона в формате E.164 или undefined если номер пустой/невалидный
 */
export function cleanPhoneNumber(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;

  try {
    // Пытаемся распарсить как международный номер
    const phoneNumber = parsePhoneNumberLib(phone)

    if (phoneNumber && phoneNumber.isValid()) {
      // Возвращаем в формате E.164
      return phoneNumber.format('E.164')
    }
  } catch (error) {
    // Если парсинг не удался, пробуем старый способ
  }

  // Fallback для российских номеров (старая логика)
  const cleaned = phone.replace(/\D/g, '');

  // Если нет цифр или номер неполный (меньше 11 цифр для РФ), возвращаем undefined
  if (!cleaned || cleaned.length < 11) {
    return undefined;
  }

  // Если номер начинается с 8, заменяем на 7
  const normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;

  // Возвращаем в формате +7XXXXXXXXXX
  return '+' + normalized;
}

/**
 * Парсит номер телефона и возвращает объект с деталями
 * @param phone - номер телефона для парсинга
 * @returns объект с деталями номера или null если номер невалидный
 */
export function parsePhoneNumber(phone: string | null | undefined) {
  if (!phone) return null;

  try {
    const phoneNumber = parsePhoneNumberLib(phone)

    if (phoneNumber && phoneNumber.isValid()) {
      return {
        isValid: true,
        country: phoneNumber.country,
        countryCallingCode: phoneNumber.countryCallingCode,
        nationalNumber: phoneNumber.nationalNumber,
        number: phoneNumber.number,
        formatted: phoneNumber.formatInternational(),
        e164: phoneNumber.format('E.164'),
      }
    }
  } catch (error) {
    // Игнорируем ошибки парсинга
  }

  return null;
}

/**
 * Определяет страну по номеру телефона
 * @param phone - номер телефона
 * @returns код страны (например, 'RU', 'US') или null
 */
export function getPhoneCountry(phone: string | null | undefined): CountryCode | null {
  if (!phone) return null;

  try {
    const phoneNumber = parsePhoneNumberLib(phone)
    return phoneNumber?.country || null
  } catch (error) {
    return null
  }
}

/**
 * Проверяет валидность номера телефона
 * @param phone - номер телефона для проверки
 * @returns true если номер валидный, false в противном случае
 */
export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;

  try {
    const phoneNumber = parsePhoneNumberLib(phone)
    return phoneNumber ? phoneNumber.isValid() : false
  } catch (error) {
    return false
  }
}
