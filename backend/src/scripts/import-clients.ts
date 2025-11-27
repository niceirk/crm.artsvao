import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient, RelationType } from '@prisma/client';
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
  parseRegistrationDate,
} from './import-utils';

const prisma = new PrismaClient();

const IMPORT_DIR = path.join(__dirname, '../../../import');
const LIMIT = process.env.IMPORT_LIMIT ? parseInt(process.env.IMPORT_LIMIT, 10) : null;
const BATCH_SIZE = 100;

interface ExistingClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: Date | null;
}

interface ImportStats {
  total: number;
  imported: number;
  duplicatePhonesProcessed: number;
  relationsCreated: number;
  documentsImported: number;
  filteredOut: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

/**
 * Определение типа родственной связи по дате рождения
 */
function determineRelationType(
  existingBirthDate: Date | null,
  newBirthDate: Date | null
): RelationType {
  // Если нет дат - по умолчанию SIBLING
  if (!existingBirthDate || !newBirthDate) {
    return RelationType.SIBLING;
  }

  const ageDiffYears = Math.abs(
    (existingBirthDate.getTime() - newBirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  // Если разница < 15 лет - братья/сёстры
  if (ageDiffYears < 15) {
    return RelationType.SIBLING;
  }

  // Если разница >= 15 лет - родитель/ребёнок
  if (existingBirthDate < newBirthDate) {
    // Существующий старше → новый клиент - его ребёнок
    return RelationType.CHILD;
  } else {
    // Новый старше → новый клиент - родитель существующего
    return RelationType.PARENT;
  }
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
 * Загрузка карты СНИЛС
 */
function loadSnilsMap(): Map<string, string> {
  const snilsMap = new Map<string, string>();
  try {
    const snilsData = readExcelFile(path.join(IMPORT_DIR, 'СНИЛС.xlsx'), 5);
    console.log(`   СНИЛС: найдено ${snilsData.length} записей`);

    for (const row of snilsData) {
      const fullName = row['Ссылка'];
      const snilsValue = row['Значение'];

      if (fullName && snilsValue) {
        const key = fullName.trim().toLowerCase();
        const normalized = normalizeSnils(String(snilsValue));
        if (normalized) {
          snilsMap.set(key, normalized);
        }
      }
    }

    console.log(`   СНИЛС: обработано ${snilsMap.size} уникальных записей`);
  } catch (error: any) {
    console.error(`   ⚠️  Ошибка чтения СНИЛС: ${error.message}`);
  }
  return snilsMap;
}

/**
 * Загрузка карты контактов (с оптимизацией через Set)
 */
function loadContactsMap(): Map<string, { addresses: string[], emails: string[], phones: string[] }> {
  const contactsMap = new Map<string, { addresses: Set<string>, emails: Set<string>, phones: Set<string> }>();
  try {
    const addressesData = readExcelFile(path.join(IMPORT_DIR, 'Адреса.xlsx'), 5);
    console.log(`   Контакты: найдено ${addressesData.length} записей`);

    for (const row of addressesData) {
      const fullName = row['Ссылка'];
      const type = row['Тип'];
      const presentation = row['Представление'];
      const emailField = row['Адрес ЭП'];

      if (!fullName) continue;

      const key = fullName.trim().toLowerCase();

      if (!contactsMap.has(key)) {
        contactsMap.set(key, { addresses: new Set(), emails: new Set(), phones: new Set() });
      }

      const contacts = contactsMap.get(key)!;

      if (type === 'Адрес' && presentation) {
        const address = extractAddress(presentation);
        if (address) contacts.addresses.add(address);
      } else if (type === 'Адрес электронной почты' && (presentation || emailField)) {
        const email = extractEmail(emailField || presentation);
        if (email) contacts.emails.add(email);
      } else if (type === 'Телефон' && presentation) {
        const phone = normalizePhone(presentation);
        if (phone) contacts.phones.add(phone);
      }
    }

    console.log(`   Контакты: обработано ${contactsMap.size} уникальных клиентов`);
  } catch (error: any) {
    console.error(`   ⚠️  Ошибка чтения контактов: ${error.message}`);
  }

  const result = new Map<string, { addresses: string[], emails: string[], phones: string[] }>();
  for (const [key, value] of contactsMap) {
    result.set(key, {
      addresses: Array.from(value.addresses),
      emails: Array.from(value.emails),
      phones: Array.from(value.phones),
    });
  }
  return result;
}

/**
 * Загрузка карты документов
 */
function loadDocumentsMap(): Map<string, any[]> {
  let documentsMap = new Map<string, any[]>();
  try {
    const documentsWorkbook = XLSX.readFile(path.join(IMPORT_DIR, 'Документы.xlsx'));
    const documentsSheet = documentsWorkbook.Sheets[documentsWorkbook.SheetNames[0]];
    const documentsData = XLSX.utils.sheet_to_json(documentsSheet, { header: 1, defval: null });

    const documentsRows = documentsData.slice(7);
    console.log(`   Документы: найдено ${documentsRows.length} записей`);

    documentsMap = buildDocumentsMap(documentsRows);

    console.log(`   Документы: обработано ${documentsMap.size} уникальных клиентов`);
  } catch (error: any) {
    console.error(`   ⚠️  Ошибка чтения документов: ${error.message}`);
  }
  return documentsMap;
}

/**
 * Построение карт для склейки данных (ПАРАЛЛЕЛЬНО)
 */
async function buildMaps() {
  console.log('\n📊 Построение карт для склейки данных (параллельно)...');

  const [snilsMap, contactsMap, documentsMap] = await Promise.all([
    Promise.resolve(loadSnilsMap()),
    Promise.resolve(loadContactsMap()),
    Promise.resolve(loadDocumentsMap()),
  ]);

  return { snilsMap, contactsMap, documentsMap };
}

/**
 * Загрузка существующих клиентов по телефону для создания родственных связей
 */
async function loadExistingClients(): Promise<Map<string, ExistingClientInfo>> {
  console.log('\n📱 Загрузка существующих клиентов для создания родственных связей...');
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      middleName: true,
      dateOfBirth: true,
    },
  });

  const clientsByPhone = new Map<string, ExistingClientInfo>();
  for (const client of clients) {
    if (client.phone && !clientsByPhone.has(client.phone)) {
      clientsByPhone.set(client.phone, {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: client.middleName,
        dateOfBirth: client.dateOfBirth,
      });
    }
  }

  console.log(`   Найдено ${clientsByPhone.size} клиентов с уникальными телефонами`);
  return clientsByPhone;
}

/**
 * Основная функция импорта
 */
async function importClients() {
  console.log('===========================================');
  console.log('🚀 ИМПОРТ КЛИЕНТОВ С РОДСТВЕННЫМИ СВЯЗЯМИ');
  console.log('===========================================\n');

  const startTime = Date.now();

  const stats: ImportStats = {
    total: 0,
    imported: 0,
    duplicatePhonesProcessed: 0,
    relationsCreated: 0,
    documentsImported: 0,
    filteredOut: 0,
    errors: [],
  };

  try {
    // 1. Параллельная загрузка данных
    const [maps, existingClientsByPhone] = await Promise.all([
      buildMaps(),
      loadExistingClients(),
    ]);

    const { snilsMap, contactsMap, documentsMap } = maps;

    // Также отслеживаем телефоны в текущем импорте для связей между новыми клиентами
    const importedClientsByPhone = new Map<string, ExistingClientInfo>();

    // 2. Чтение основного файла клиентов
    console.log('\n📖 Чтение файла клиентов...');
    const clients = readExcelFile(path.join(IMPORT_DIR, 'Клиенты.xlsx'), 5);

    const totalClients = LIMIT ? Math.min(LIMIT, clients.length) : clients.length;
    stats.total = totalClients;

    console.log(`   Всего клиентов для импорта: ${totalClients}`);
    if (LIMIT) {
      console.log(`   ⚠️  ВНИМАНИЕ: Установлен лимит импорта - ${LIMIT} клиентов`);
    }

    // 3. Подготовка данных для batch импорта
    console.log('\n💾 Подготовка данных для импорта...');

    interface ClientToCreate {
      data: any;
      fullNameKey: string;
      rowNumber: number;
      relateToClientId?: string;
      relateToDateOfBirth?: Date | null;
    }

    const clientsToCreate: ClientToCreate[] = [];
    const clientDocumentsToCreate: Map<number, any[]> = new Map();

    for (let i = 0; i < totalClients; i++) {
      const row = clients[i];
      const rowNumber = i + 7;

      try {
        // Фильтрация по структурному подразделению - только артсвао.ру
        const structuralUnit = row['Структурная единица'];
        if (!structuralUnit || structuralUnit.trim().toLowerCase() !== 'артсвао.ру') {
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

        // Получение телефона
        const fullNameRef = row['Ссылка'] || row['Полное наименование'];
        const fullNameKey = fullNameRef ? fullNameRef.trim().toLowerCase() : createFullNameKey(lastName, firstName, middleName);

        const contacts = contactsMap.get(fullNameKey) || { addresses: [], emails: [], phones: [] };
        const phone = contacts.phones[0] || normalizePhone(row['Телефон']);
        const phoneAdditional = contacts.phones[1] || null;

        // Подготовка данных
        const registrationDate = parseRegistrationDate(row['Дата регистрации']);
        const dateOfBirth = transformBirthDate(row['Дата рождения']);

        const clientData: any = {
          firstName,
          lastName,
          middleName: middleName || null,
          clientType: transformClientType(row['Юр. / физ. лицо']),
          dateOfBirth,
          gender: transformGender(row['Пол']),
          phone: phone || '+70000000000',
          email: contacts.emails[0] || null,
          address: contacts.addresses[0] || null,
          notes: row['Комментарий'] || null,
          snils: snilsMap.get(fullNameKey) || null,
          phoneAdditional,
          status: 'ACTIVE',
          createdAt: registrationDate || undefined,
        };

        // Для юридических лиц
        if (clientData.clientType === 'LEGAL_ENTITY') {
          clientData.companyName = row['Полное наименование'] || fullNameRef || null;
          clientData.inn = row['ИНН'] || null;
        }

        // Проверка на совпадение телефона
        let relateToClientId: string | undefined;
        let relateToDateOfBirth: Date | null | undefined;

        if (phone) {
          // Сначала проверяем в существующих клиентах БД
          const existingClient = existingClientsByPhone.get(phone);
          if (existingClient) {
            relateToClientId = existingClient.id;
            relateToDateOfBirth = existingClient.dateOfBirth;
            stats.duplicatePhonesProcessed++;
            console.log(`   👨‍👩‍👧 ${lastName} ${firstName} → связь с существующим ${existingClient.lastName} ${existingClient.firstName}`);
          } else {
            // Проверяем среди уже подготовленных к импорту
            const importedClient = importedClientsByPhone.get(phone);
            if (importedClient) {
              relateToClientId = importedClient.id; // Временный ID - будет заменён
              relateToDateOfBirth = importedClient.dateOfBirth;
              stats.duplicatePhonesProcessed++;
              console.log(`   👨‍👩‍👧 ${lastName} ${firstName} → связь с импортируемым ${importedClient.lastName} ${importedClient.firstName}`);
            } else {
              // Первый клиент с этим телефоном - запоминаем
              importedClientsByPhone.set(phone, {
                id: `temp_${clientsToCreate.length}`, // Временный ID
                firstName,
                lastName,
                middleName: middleName || null,
                dateOfBirth,
              });
            }
          }
        }

        const clientIndex = clientsToCreate.length;
        clientsToCreate.push({
          data: clientData,
          fullNameKey,
          rowNumber,
          relateToClientId,
          relateToDateOfBirth,
        });

        // Сохраняем документы для этого клиента
        const clientDocuments = documentsMap.get(fullNameKey) || [];
        if (clientDocuments.length > 0) {
          clientDocumentsToCreate.set(clientIndex, clientDocuments);
        }

      } catch (error: any) {
        stats.errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    console.log(`\n   Подготовлено клиентов для импорта: ${clientsToCreate.length}`);
    console.log(`   Клиентов с совпадающими телефонами: ${stats.duplicatePhonesProcessed}`);

    // 4. Batch импорт клиентов
    console.log('\n⚡ Batch импорт клиентов...');

    // Хранилище для созданных клиентов и их связей
    const createdClientsMap = new Map<number, string>(); // index -> clientId
    const relationsToCreate: Array<{
      clientId: string;
      relatedClientId: string;
      relationType: RelationType;
      newClientDateOfBirth: Date | null;
    }> = [];

    // Также нужно обновить временные ID на реальные для связей между новыми клиентами
    const tempIdToRealId = new Map<string, string>(); // temp_X -> real UUID

    for (let batchStart = 0; batchStart < clientsToCreate.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, clientsToCreate.length);
      const batch = clientsToCreate.slice(batchStart, batchEnd);

      // Создаём клиентов в транзакции
      const createdClients = await prisma.$transaction(
        batch.map(item => prisma.client.create({ data: item.data }))
      );

      stats.imported += createdClients.length;

      // Сохраняем ID созданных клиентов
      for (let i = 0; i < createdClients.length; i++) {
        const clientIndex = batchStart + i;
        const createdClient = createdClients[i];
        const clientInfo = batch[i];

        createdClientsMap.set(clientIndex, createdClient.id);
        tempIdToRealId.set(`temp_${clientIndex}`, createdClient.id);

        // Если есть связь с существующим клиентом
        if (clientInfo.relateToClientId) {
          relationsToCreate.push({
            clientId: createdClient.id,
            relatedClientId: clientInfo.relateToClientId,
            relationType: RelationType.SIBLING, // Временно, определим позже
            newClientDateOfBirth: clientInfo.data.dateOfBirth,
          });
        }
      }

      // Создаём документы для каждого клиента
      const documentsBatch: any[] = [];
      for (let i = 0; i < createdClients.length; i++) {
        const clientIndex = batchStart + i;
        const documents = clientDocumentsToCreate.get(clientIndex);
        if (documents) {
          for (const doc of documents) {
            documentsBatch.push({
              clientId: createdClients[i].id,
              ...doc,
            });
          }
        }
      }

      // Batch создание документов
      if (documentsBatch.length > 0) {
        try {
          const result = await prisma.clientDocument.createMany({
            data: documentsBatch,
            skipDuplicates: true,
          });
          stats.documentsImported += result.count;
        } catch (docError: any) {
          console.log(`   ⚠️  Ошибка batch создания документов: ${docError.message}`);
          for (const doc of documentsBatch) {
            try {
              await prisma.clientDocument.create({ data: doc });
              stats.documentsImported++;
            } catch (e) {
              // Игнорируем дубликаты
            }
          }
        }
      }

      // Прогресс
      console.log(`   ✓ Импортировано: ${stats.imported}/${clientsToCreate.length}`);
    }

    // 5. Создание родственных связей
    if (relationsToCreate.length > 0) {
      console.log('\n👨‍👩‍👧‍👦 Создание родственных связей...');

      // Заменяем временные ID на реальные и определяем тип связи
      const finalRelations: Array<{
        clientId: string;
        relatedClientId: string;
        relationType: RelationType;
      }> = [];

      for (const relation of relationsToCreate) {
        let relatedClientId = relation.relatedClientId;

        // Если это временный ID - заменяем на реальный
        if (relatedClientId.startsWith('temp_')) {
          const realId = tempIdToRealId.get(relatedClientId);
          if (realId) {
            relatedClientId = realId;
          } else {
            console.log(`   ⚠️ Не найден реальный ID для ${relatedClientId}`);
            continue;
          }
        }

        // Получаем дату рождения связанного клиента
        let relatedDateOfBirth: Date | null = null;

        // Сначала проверяем в существующих клиентах
        for (const [, clientInfo] of existingClientsByPhone) {
          if (clientInfo.id === relatedClientId) {
            relatedDateOfBirth = clientInfo.dateOfBirth;
            break;
          }
        }

        // Если не нашли - загружаем из БД
        if (!relatedDateOfBirth) {
          const relatedClient = await prisma.client.findUnique({
            where: { id: relatedClientId },
            select: { dateOfBirth: true },
          });
          relatedDateOfBirth = relatedClient?.dateOfBirth || null;
        }

        // Определяем тип связи
        const relationType = determineRelationType(relatedDateOfBirth, relation.newClientDateOfBirth);

        finalRelations.push({
          clientId: relation.clientId,
          relatedClientId,
          relationType,
        });
      }

      // Batch создание связей
      if (finalRelations.length > 0) {
        try {
          const result = await prisma.clientRelation.createMany({
            data: finalRelations,
            skipDuplicates: true,
          });
          stats.relationsCreated = result.count;
          console.log(`   ✓ Создано ${result.count} родственных связей`);

          // Логируем типы связей
          const relationTypes = finalRelations.reduce((acc, r) => {
            acc[r.relationType] = (acc[r.relationType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          for (const [type, count] of Object.entries(relationTypes)) {
            console.log(`      - ${type}: ${count}`);
          }
        } catch (relError: any) {
          console.log(`   ⚠️ Ошибка создания связей: ${relError.message}`);
        }
      }
    }

    // 6. Вывод статистики
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n===========================================');
    console.log('📈 РЕЗУЛЬТАТЫ ИМПОРТА');
    console.log('===========================================');
    console.log(`⏱️  Время выполнения:     ${duration} сек`);
    console.log(`Всего обработано:        ${stats.total}`);
    console.log(`✅ Импортировано:        ${stats.imported}`);
    console.log(`📄 Документов:           ${stats.documentsImported}`);
    console.log(`👨‍👩‍👧 Совпадающие телефоны: ${stats.duplicatePhonesProcessed}`);
    console.log(`🔗 Родственных связей:   ${stats.relationsCreated}`);
    console.log(`🚫 Отфильтровано:        ${stats.filteredOut}`);
    console.log(`❌ Ошибки:               ${stats.errors.length}`);
    console.log('===========================================\n');

    // 7. Вывод первых ошибок
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
