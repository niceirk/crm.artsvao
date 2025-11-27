import { Gender, ClientType } from '@prisma/client';

/**
 * Утилиты для трансформации данных импорта
 */

/**
 * Нормализация телефона (использует существующую утилиту)
 */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;

  // Удаляем все нецифровые символы
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) return null;

  // Если начинается с 8, заменяем на 7
  let normalized = digits.startsWith('8') ? '7' + digits.slice(1) : digits;

  // Если начинается с 7, добавляем +
  if (normalized.startsWith('7')) {
    normalized = '+' + normalized;
  } else if (normalized.length === 10) {
    // Если 10 цифр, добавляем +7
    normalized = '+7' + normalized;
  }

  // Проверяем длину (должно быть +7XXXXXXXXXX = 12 символов)
  if (normalized.length !== 12) return null;

  return normalized;
}

/**
 * Трансформация даты рождения из разных форматов в ISO DateTime
 */
export function transformBirthDate(date: any): Date | null {
  if (!date) return null;

  try {
    // Если уже Date объект
    if (date instanceof Date) {
      return date;
    }

    // Если строка в формате ДД.ММ.ГГГГ
    if (typeof date === 'string') {
      const parts = date.trim().split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // months are 0-indexed
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }

      // Попытка разобрать как стандартную дату
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Трансформация пола из русского в enum
 */
export function transformGender(gender: string | null): Gender | null {
  if (!gender) return null;

  const normalized = gender.trim().toLowerCase();

  if (normalized.includes('муж') || normalized === 'м') {
    return Gender.MALE;
  }

  if (normalized.includes('жен') || normalized === 'ж') {
    return Gender.FEMALE;
  }

  return null;
}

/**
 * Нормализация СНИЛС
 */
export function normalizeSnils(snils: string | null): string | null {
  if (!snils) return null;

  // Удаляем все нецифровые символы
  const digits = snils.replace(/\D/g, '');

  // Проверяем длину (должно быть 11 цифр)
  if (digits.length !== 11) return null;

  // Форматируем: XXX-XXX-XXX XX
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
}

/**
 * Нормализация паспорта
 */
export function normalizePassport(passport: string | null): string | null {
  if (!passport) return null;

  // Удаляем все нецифровые символы
  const digits = passport.replace(/\D/g, '');

  // Проверяем длину (должно быть 10 цифр)
  if (digits.length !== 10) return null;

  // Форматируем: XXXX XXXXXX
  return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
}

/**
 * Определение типа клиента (физ/юр лицо)
 */
export function transformClientType(type: string | null): ClientType {
  if (!type) return ClientType.INDIVIDUAL;

  const normalized = type.trim().toLowerCase();

  if (normalized.includes('юр')) {
    return ClientType.LEGAL_ENTITY;
  }

  return ClientType.INDIVIDUAL;
}

/**
 * Создание ключа для склейки данных по ФИО
 */
export function createFullNameKey(lastName?: string | null, firstName?: string | null, middleName?: string | null): string {
  const parts = [lastName, firstName, middleName]
    .filter(part => part && part.trim())
    .map(part => part!.trim().toLowerCase());

  return parts.join(' ');
}

/**
 * Извлечение адреса из представления
 */
export function extractAddress(addressData: any): string | null {
  if (!addressData) return null;

  // Если это строка "Представление"
  if (typeof addressData === 'string') {
    return addressData.trim() || null;
  }

  return null;
}

/**
 * Извлечение email
 */
export function extractEmail(emailData: any): string | null {
  if (!emailData) return null;

  // Если это строка "Представление" или "Адрес ЭП"
  if (typeof emailData === 'string') {
    const email = emailData.trim().toLowerCase();
    // Простая проверка формата email
    if (email.includes('@') && email.includes('.')) {
      return email;
    }
  }

  return null;
}

/**
 * Парсинг даты документа из разных форматов
 */
export function parseDocumentDate(date: any): Date | null {
  if (!date) return null;

  try {
    // Если уже Date объект
    if (date instanceof Date) {
      return date;
    }

    // Если строка в формате ДД.ММ.ГГГГ
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (!trimmed) return null;

      const parts = trimmed.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }

      // Попытка разобрать как стандартную дату
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Парсинг даты регистрации из формата "ДД.ММ.ГГГГ ЧЧ:ММ:СС"
 */
export function parseRegistrationDate(dateTime: any): Date | null {
  if (!dateTime) return null;

  try {
    // Если уже Date объект
    if (dateTime instanceof Date) {
      return dateTime;
    }

    // Если строка в формате "ДД.ММ.ГГГГ ЧЧ:ММ:СС"
    if (typeof dateTime === 'string') {
      const trimmed = dateTime.trim();
      if (!trimmed) return null;

      // Разделяем дату и время
      const [datePart, timePart] = trimmed.split(' ');
      if (!datePart) return null;

      // Парсим дату
      const dateParts = datePart.split('.');
      if (dateParts.length !== 3) return null;

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const year = parseInt(dateParts[2]);

      // Парсим время (если есть)
      let hours = 0, minutes = 0, seconds = 0;
      if (timePart) {
        const timeParts = timePart.split(':');
        hours = parseInt(timeParts[0]) || 0;
        minutes = parseInt(timeParts[1]) || 0;
        seconds = parseInt(timeParts[2]) || 0;
      }

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day, hours, minutes, seconds);
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Преобразование "Да"/"Нет" в boolean
 */
export function transformYesNo(value: string | null): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized === 'да' || normalized === 'yes' || normalized === 'true';
}

/**
 * Маппинг типов документов из 1С в enum DocumentType
 */
export function mapDocumentType(docType: string | null): string | null {
  if (!docType) return null;

  const normalized = docType.trim().toLowerCase();

  // Паспорт РФ
  if (normalized.includes('паспорт') && !normalized.includes('загран')) {
    return 'PASSPORT';
  }

  // Свидетельство о рождении
  if (normalized.includes('свидетельство о рождении')) {
    return 'BIRTH_CERTIFICATE';
  }

  // Водительское удостоверение
  if (normalized.includes('водительское') || normalized.includes('водит')) {
    return 'DRIVERS_LICENSE';
  }

  // СНИЛС
  if (normalized.includes('снилс')) {
    return 'SNILS';
  }

  // Заграничный паспорт
  if (normalized.includes('загран')) {
    return 'FOREIGN_PASSPORT';
  }

  // ИНН
  if (normalized.includes('инн')) {
    return 'INN';
  }

  // Медицинская справка
  if (normalized.includes('медицинская') || normalized.includes('мед.')) {
    return 'MEDICAL_CERTIFICATE';
  }

  // Справка МСЭ
  if (normalized.includes('мсэ')) {
    return 'MSE_CERTIFICATE';
  }

  // Другой документ
  return 'OTHER';
}

/**
 * Построение карты документов по ФИО клиента
 */
export function buildDocumentsMap(documentsData: any[]): Map<string, any[]> {
  const documentsMap = new Map<string, any[]>();

  for (const row of documentsData) {
    if (!row || row.length < 15) continue;

    const fullName = row[3]; // Колонка "Физ. лицо"
    if (!fullName || typeof fullName !== 'string') continue;

    // Разбиваем ФИО на части (Фамилия Имя Отчество)
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) continue;

    const lastName = nameParts[0];
    const firstName = nameParts[1];
    const middleName = nameParts.length > 2 ? nameParts.slice(2).join(' ') : null;

    const nameKey = createFullNameKey(lastName, firstName, middleName);

    const docType = row[0]; // Вид документа
    const mappedType = mapDocumentType(docType);
    if (!mappedType) continue;

    const document = {
      documentType: mappedType,
      series: row[10] || null, // Серия
      number: row[8] || null, // Номер
      issuedBy: row[6] || null, // Кем выдан
      issuedAt: parseDocumentDate(row[5]), // Дата выдачи
      expiresAt: parseDocumentDate(row[11]), // Срок действия
      departmentCode: row[7] || null, // Код подразделения
      isPrimary: transformYesNo(row[13]), // Основной
      citizenship: row[14] || null, // Гражданство
      fullDisplay: row[9] || null, // Представление
    };

    if (!documentsMap.has(nameKey)) {
      documentsMap.set(nameKey, []);
    }

    documentsMap.get(nameKey)!.push(document);
  }

  return documentsMap;
}

/**
 * Парсинг документа продажи: "Продажа 14809 от 27.11.2025 11:25"
 */
export function parseSaleDocument(doc: string): { number: string; date: Date } | null {
  if (!doc) return null;

  const match = doc.match(/Продажа\s+(\d+)\s+от\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, number, day, month, year, hours, minutes] = match;

  return {
    number,
    date: new Date(+year, +month - 1, +day, +hours, +minutes),
  };
}
