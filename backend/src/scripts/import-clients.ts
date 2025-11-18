import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  normalizePhone,
  transformBirthDate,
  transformGender,
  normalizeSnils,
  transformClientType,
  createFullNameKey,
  extractAddress,
  extractEmail,
  buildDocumentsMap,
  parseDocumentDate,
  parseRegistrationDate,
} from './import-utils';

const prisma = new PrismaClient();

const IMPORT_DIR = path.join(__dirname, '../../../import');
const LIMIT = process.env.IMPORT_LIMIT ? parseInt(process.env.IMPORT_LIMIT, 10) : null;

interface ImportStats {
  total: number;
  imported: number;
  duplicates: number;
  documentsImported: number;
  filteredOut: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

/**
 * Чтение файла Excel с пропуском служебных строк
 */
function readExcelFile(filePath: string, headerRow: number = 5): any[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  const headers = rawData[headerRow];
  const dataRows = rawData.slice(headerRow + 1);

  // Преобразуем в объекты
  return dataRows.map(row => {
    const obj: any = {};
    headers.forEach((header, idx) => {
      if (header) {
        obj[header] = row[idx];
      }
    });
    return obj;
  });
}

/**
 * Построение карт для склейки данных
 */
async function buildMaps() {
  console.log('\n📊 Построение карт для склейки данных...');

  // Карта СНИЛС: ФИО -> СНИЛС
  const snilsMap = new Map<string, string>();
  try {
    const snilsData = readExcelFile(path.join(IMPORT_DIR, 'СНИЛС.xlsx'), 5);
    console.log(`   СНИЛС: найдено ${snilsData.length} записей`);

    snilsData.forEach(row => {
      const fullName = row['Ссылка'];
      const snilsValue = row['Значение'];

      if (fullName && snilsValue) {
        const key = fullName.trim().toLowerCase();
        const normalized = normalizeSnils(String(snilsValue));
        if (normalized) {
          snilsMap.set(key, normalized);
        }
      }
    });

    console.log(`   СНИЛС: обработано ${snilsMap.size} уникальных записей`);
  } catch (error) {
    console.error(`   ⚠️  Ошибка чтения СНИЛС: ${error.message}`);
  }

  // Карта адресов и email: ФИО -> { addresses: [], emails: [], phones: [] }
  const contactsMap = new Map<string, { addresses: string[], emails: string[], phones: string[] }>();
  try {
    const addressesData = readExcelFile(path.join(IMPORT_DIR, 'Адреса.xlsx'), 5);
    console.log(`   Контакты: найдено ${addressesData.length} записей`);

    addressesData.forEach(row => {
      const fullName = row['Ссылка'];
      const type = row['Тип'];
      const presentation = row['Представление'];
      const emailField = row['Адрес ЭП'];

      if (!fullName) return;

      const key = fullName.trim().toLowerCase();

      if (!contactsMap.has(key)) {
        contactsMap.set(key, { addresses: [], emails: [], phones: [] });
      }

      const contacts = contactsMap.get(key)!;

      if (type === 'Адрес' && presentation) {
        const address = extractAddress(presentation);
        if (address && !contacts.addresses.includes(address)) {
          contacts.addresses.push(address);
        }
      } else if (type === 'Адрес электронной почты' && (presentation || emailField)) {
        const email = extractEmail(emailField || presentation);
        if (email && !contacts.emails.includes(email)) {
          contacts.emails.push(email);
        }
      } else if (type === 'Телефон' && presentation) {
        const phone = normalizePhone(presentation);
        if (phone && !contacts.phones.includes(phone)) {
          contacts.phones.push(phone);
        }
      }
    });

    console.log(`   Контакты: обработано ${contactsMap.size} уникальных клиентов`);
  } catch (error) {
    console.error(`   ⚠️  Ошибка чтения контактов: ${error.message}`);
  }

  // Карта документов: ФИО -> Документы[]
  let documentsMap = new Map<string, any[]>();
  try {
    const documentsWorkbook = XLSX.readFile(path.join(IMPORT_DIR, 'Документы.xlsx'));
    const documentsSheet = documentsWorkbook.Sheets[documentsWorkbook.SheetNames[0]];
    const documentsData = XLSX.utils.sheet_to_json(documentsSheet, { header: 1, defval: null });

    // Пропускаем служебные строки 0-6, данные начинаются с строки 7
    const documentsRows = documentsData.slice(7);

    console.log(`   Документы: найдено ${documentsRows.length} записей`);

    documentsMap = buildDocumentsMap(documentsRows);

    console.log(`   Документы: обработано ${documentsMap.size} уникальных клиентов`);
  } catch (error) {
    console.error(`   ⚠️  Ошибка чтения документов: ${error.message}`);
  }

  return { snilsMap, contactsMap, documentsMap };
}

/**
 * Проверка дубликата по телефону
 */
async function checkDuplicate(phone: string | null): Promise<boolean> {
  if (!phone) return false;

  const existing = await prisma.client.findFirst({
    where: { phone },
  });

  return !!existing;
}

/**
 * Основная функция импорта
 */
async function importClients() {
  console.log('===========================================');
  console.log('🚀 ИМПОРТ КЛИЕНТОВ В CRM');
  console.log('===========================================\n');

  const stats: ImportStats = {
    total: 0,
    imported: 0,
    duplicates: 0,
    documentsImported: 0,
    filteredOut: 0,
    errors: [],
  };

  try {
    // 1. Построение карт
    const { snilsMap, contactsMap, documentsMap } = await buildMaps();

    // 2. Чтение основного файла клиентов
    console.log('\n📖 Чтение файла клиентов...');
    const clients = readExcelFile(path.join(IMPORT_DIR, 'Клиенты.xlsx'), 5);

    const totalClients = LIMIT ? Math.min(LIMIT, clients.length) : clients.length;
    stats.total = totalClients;

    console.log(`   Всего клиентов для импорта: ${totalClients}`);
    if (LIMIT) {
      console.log(`   ⚠️  ВНИМАНИЕ: Установлен лимит импорта - ${LIMIT} клиентов`);
    }

    // 3. Обработка каждого клиента
    console.log('\n💾 Начало импорта...\n');

    for (let i = 0; i < totalClients; i++) {
      const row = clients[i];
      const rowNumber = i + 7; // +6 для служебных строк +1 для заголовка

      try {
        // Фильтрация по структурному подразделению
        const structuralUnit = row['Структурная единица'];
        if (structuralUnit && structuralUnit.trim().toLowerCase() !== 'артсвао.ру') {
          stats.filteredOut++;
          continue;
        }

        // Извлечение данных
        const firstName = row['Имя'];
        const lastName = row['Фамилия'];
        const middleName = row['Отчество'];

        // Проверка обязательных полей
        if (!firstName || !lastName) {
          stats.errors.push({
            row: rowNumber,
            error: 'Отсутствуют обязательные поля: Имя или Фамилия',
            data: { firstName, lastName },
          });
          continue;
        }

        // Получение телефона (сначала из контактов, потом из основного файла)
        const fullNameRef = row['Ссылка'] || row['Полное наименование'];
        const fullNameKey = fullNameRef ? fullNameRef.trim().toLowerCase() : createFullNameKey(lastName, firstName, middleName);

        const contacts = contactsMap.get(fullNameKey) || { addresses: [], emails: [], phones: [] };
        let phone = contacts.phones[0] || normalizePhone(row['Телефон']);
        const phoneAdditional = contacts.phones[1] || null;

        // Проверка дубликата
        if (phone && await checkDuplicate(phone)) {
          stats.duplicates++;
          continue;
        }

        // Если нет телефона, пропускаем (необязательное поле по требованиям)
        // Но логируем для информации
        if (!phone) {
          console.log(`   ⚠️  Строка ${rowNumber}: нет телефона для ${lastName} ${firstName}`);
        }

        // Подготовка данных
        const registrationDate = parseRegistrationDate(row['Дата регистрации']);
        const clientData: any = {
          firstName,
          lastName,
          middleName: middleName || null,
          clientType: transformClientType(row['Юр. / физ. лицо']),
          dateOfBirth: transformBirthDate(row['Дата рождения']),
          gender: transformGender(row['Пол']),
          phone: phone || '+70000000000', // Временный телефон если нет
          email: contacts.emails[0] || null,
          address: contacts.addresses[0] || null,
          notes: row['Комментарий'] || null,
          snils: snilsMap.get(fullNameKey) || null,
          phoneAdditional,
          status: 'ACTIVE',
          createdAt: registrationDate || undefined, // Дата создания из файла
        };

        // Для юридических лиц
        if (clientData.clientType === 'LEGAL_ENTITY') {
          clientData.companyName = row['Полное наименование'] || fullNameRef || null;
          clientData.inn = row['ИНН'] || null;
        }

        // Создание клиента
        const client = await prisma.client.create({ data: clientData });

        stats.imported++;

        // Создание документов клиента
        const clientDocuments = documentsMap.get(fullNameKey) || [];
        if (clientDocuments.length > 0) {
          for (const doc of clientDocuments) {
            try {
              await prisma.clientDocument.create({
                data: {
                  clientId: client.id,
                  ...doc,
                },
              });
              stats.documentsImported++;
            } catch (docError) {
              // Игнорируем ошибки создания документов (например, дубликаты типов)
              console.log(`   ⚠️  Строка ${rowNumber}: ошибка создания документа ${doc.documentType}: ${docError.message}`);
            }
          }
        }

        // Прогресс
        if ((i + 1) % 100 === 0) {
          console.log(`   ✓ Импортировано: ${stats.imported}/${totalClients}`);
        }

      } catch (error) {
        stats.errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    // 4. Вывод статистики
    console.log('\n===========================================');
    console.log('📈 РЕЗУЛЬТАТЫ ИМПОРТА');
    console.log('===========================================');
    console.log(`Всего обработано:        ${stats.total}`);
    console.log(`✅ Импортировано:        ${stats.imported}`);
    console.log(`📄 Документов:           ${stats.documentsImported}`);
    console.log(`🔄 Дубликаты:            ${stats.duplicates}`);
    console.log(`🚫 Отфильтровано:        ${stats.filteredOut}`);
    console.log(`❌ Ошибки:               ${stats.errors.length}`);
    console.log('===========================================\n');

    // 5. Вывод первых ошибок
    if (stats.errors.length > 0) {
      console.log('⚠️  ПЕРВЫЕ 10 ОШИБОК:\n');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`   Строка ${err.row}: ${err.error}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка импорта:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск импорта
importClients().catch(console.error);
