import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseSaleDocument } from './import-utils';

const prisma = new PrismaClient();
const IMPORT_DIR = path.join(__dirname, '../../../import');
const BATCH_SIZE = 100;

// Маппинг тегов на BenefitCategory
const BENEFIT_TAG_MAPPING: Record<string, string> = {
  'Льгота ВОВ': 'Ветераны Великой Отечественной войны',
  'Льгота ДИ': 'Дети инвалиды',
  'Льгота ДС': 'Дети сироты',
  'Льгота МС': 'Многодетные семьи',
  'Льгота СВО': 'СВО',
};

interface ImportStats {
  benefitCategories: { created: number; existing: number };
  benefitTags: { processed: number; updated: number; notFound: number };
  notes: { processed: number; imported: number; duplicates: number; errors: number };
  sales: { processed: number; imported: number; duplicates: number; clientNotFound: number };
  payments: { processed: number; linked: number; notFound: number };
}

interface ClientInfo {
  id: string;
  benefitCategoryId: string | null;
}

// Глобальный кэш клиентов для O(1) lookup
let clientsMap: Map<string, ClientInfo> = new Map();

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
    headers.forEach((header: string, idx: number) => {
      if (header) {
        obj[header] = row[idx];
      }
    });
    return obj;
  });
}

/**
 * Загрузка всех клиентов в Map для O(1) поиска по ФИО
 */
async function loadClientsMap(): Promise<Map<string, ClientInfo>> {
  console.log('\n📊 Загрузка клиентов в память для быстрого поиска...');

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      benefitCategoryId: true,
    },
  });

  const map = new Map<string, ClientInfo>();

  for (const client of clients) {
    // Создаём ключ в формате "фамилия имя отчество"
    const key = [
      client.lastName?.toLowerCase().trim(),
      client.firstName?.toLowerCase().trim(),
      client.middleName?.toLowerCase().trim() || '',
    ].filter(Boolean).join(' ');

    map.set(key, {
      id: client.id,
      benefitCategoryId: client.benefitCategoryId,
    });
  }

  console.log(`   Загружено ${map.size} клиентов`);
  return map;
}

/**
 * Поиск клиента по ФИО (O(1) lookup в кэше)
 */
function findClientByName(nameKey: string): ClientInfo | null {
  const normalized = nameKey.trim().toLowerCase();
  return clientsMap.get(normalized) || null;
}

/**
 * Создание категорий льгот
 */
async function ensureBenefitCategories(stats: ImportStats) {
  console.log('\n🏷️  Создание категорий льгот...');

  const existingCategories = await prisma.benefitCategory.findMany();
  const existingNames = new Set(existingCategories.map(c => c.name));

  const toCreate: any[] = [];

  for (const [tag, categoryName] of Object.entries(BENEFIT_TAG_MAPPING)) {
    if (existingNames.has(categoryName)) {
      stats.benefitCategories.existing++;
      console.log(`   ✓ Существует: ${categoryName}`);
    } else {
      toCreate.push({
        name: categoryName,
        discountPercent: 0,
        description: `Импортировано из тега "${tag}"`,
        requiresDocument: true,
        isActive: true,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.benefitCategory.createMany({ data: toCreate });
    stats.benefitCategories.created = toCreate.length;
    toCreate.forEach(c => console.log(`   + Создано: ${c.name}`));
  }
}

/**
 * Импорт тегов льгот (оптимизировано с batch обновлениями)
 */
async function importBenefitTags(stats: ImportStats) {
  console.log('\n📌 Импорт тегов льгот...');

  // Загрузка категорий льгот из БД
  const benefitCategories = await prisma.benefitCategory.findMany();
  const categoryMap = new Map(benefitCategories.map(c => [c.name, c.id]));

  // Чтение файла тегов
  const tagsData = readExcelFile(path.join(IMPORT_DIR, 'Теги.xlsx'), 5);
  console.log(`   Найдено ${tagsData.length} записей в файле`);

  // Подготовка обновлений
  const updates: Array<{ id: string; categoryId: string }> = [];

  for (const row of tagsData) {
    const clientName = row['Ссылка'];
    const tag = row['Тег'];

    if (!clientName || !tag) continue;
    if (!tag.startsWith('Льгота')) continue;

    stats.benefitTags.processed++;

    const categoryName = BENEFIT_TAG_MAPPING[tag];
    if (!categoryName) {
      console.log(`   ⚠️ Неизвестный тег льготы: ${tag}`);
      continue;
    }

    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) continue;

    // O(1) поиск клиента
    const client = findClientByName(clientName);

    if (!client) {
      stats.benefitTags.notFound++;
      continue;
    }

    // Обновление только если категория не установлена
    if (!client.benefitCategoryId) {
      updates.push({ id: client.id, categoryId });
      // Обновляем кэш чтобы не дублировать обновления
      client.benefitCategoryId = categoryId;
    }
  }

  // Batch обновление
  if (updates.length > 0) {
    console.log(`   Выполняю batch обновление ${updates.length} клиентов...`);

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map(u => prisma.client.update({
          where: { id: u.id },
          data: { benefitCategoryId: u.categoryId },
        }))
      );
    }

    stats.benefitTags.updated = updates.length;
  }

  console.log(`   ✓ Обработано: ${stats.benefitTags.processed}`);
  console.log(`   ✓ Обновлено: ${stats.benefitTags.updated}`);
  console.log(`   ⚠️ Клиент не найден: ${stats.benefitTags.notFound}`);
}

/**
 * Импорт заметок (оптимизировано с batch созданием)
 */
async function importNotes(stats: ImportStats) {
  console.log('\n📝 Импорт заметок...');

  const notesData = readExcelFile(path.join(IMPORT_DIR, 'Заметки.xlsx'), 6);
  console.log(`   Найдено ${notesData.length} записей в файле`);

  // Загрузка существующих заметок для проверки дубликатов
  console.log('   Загрузка существующих заметок...');
  const existingNotes = await prisma.clientNote.findMany({
    select: { clientId: true, content: true },
  });
  const existingNotesSet = new Set(
    existingNotes.map(n => `${n.clientId}|${n.content}`)
  );
  console.log(`   Найдено ${existingNotesSet.size} существующих заметок`);

  // Подготовка заметок для создания
  const notesToCreate: any[] = [];

  for (const row of notesData) {
    const clientName = row['Объект'];
    const authorName = row['Автор'];
    const content = row['Заметка'];

    if (!clientName || !content) continue;

    stats.notes.processed++;

    const client = findClientByName(clientName.trim().toLowerCase());
    if (!client) {
      stats.notes.errors++;
      continue;
    }

    const contentTrimmed = content.trim();
    const noteKey = `${client.id}|${contentTrimmed}`;

    if (existingNotesSet.has(noteKey)) {
      stats.notes.duplicates++;
      continue;
    }

    // Добавляем в Set чтобы избежать дубликатов в текущем импорте
    existingNotesSet.add(noteKey);

    notesToCreate.push({
      clientId: client.id,
      content: contentTrimmed,
      authorName: authorName || null,
      createdBy: null,
    });
  }

  // Batch создание заметок
  if (notesToCreate.length > 0) {
    console.log(`   Создание ${notesToCreate.length} заметок batch...`);

    for (let i = 0; i < notesToCreate.length; i += BATCH_SIZE) {
      const batch = notesToCreate.slice(i, i + BATCH_SIZE);
      await prisma.clientNote.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    stats.notes.imported = notesToCreate.length;
  }

  console.log(`   ✓ Обработано: ${stats.notes.processed}`);
  console.log(`   ✓ Импортировано: ${stats.notes.imported}`);
  console.log(`   ⚠️ Дубликаты: ${stats.notes.duplicates}`);
  console.log(`   ❌ Ошибки: ${stats.notes.errors}`);
}

/**
 * Импорт продаж (оптимизировано)
 */
async function importSales(year: string, stats: ImportStats) {
  console.log(`\n🛒 Импорт продаж ${year}...`);

  const filePath = path.join(IMPORT_DIR, `Продажи${year}.xlsx`);

  // 2022: headerRow=6, 2023-2025: headerRow=7 (разная структура файлов)
  const headerRow = year === '22' ? 6 : 7;
  const salesData = readExcelFile(filePath, headerRow);
  console.log(`   Найдено ${salesData.length} записей в файле`);

  // Группировка по документу продажи
  const salesMap = new Map<string, {
    clientName: string;
    sellerName: string;
    items: Array<{ name: string; qty: number; price: number; total: number }>;
    totalAmount: number;
  }>();

  let filteredOut = 0;
  for (const row of salesData) {
    // Фильтрация по структурному подразделению - только артсвао.ру
    const structuralUnit = row['Структурная единица'];
    if (!structuralUnit || structuralUnit.trim().toLowerCase() !== 'артсвао.ру') {
      filteredOut++;
      continue;
    }

    const clientName = row['Клиент'];
    const saleDoc = row['Документ продажи'];
    const itemName = row['Номенклатура'];
    const sellerName = row['Продавец'];
    const price = parseFloat(row['Стоимость']) || 0;
    const qty = parseFloat(row['Количество']) || 1;

    if (!clientName || !saleDoc) continue;

    if (!salesMap.has(saleDoc)) {
      salesMap.set(saleDoc, {
        clientName,
        sellerName,
        items: [],
        totalAmount: 0,
      });
    }

    const sale = salesMap.get(saleDoc)!;
    const total = price;
    sale.items.push({ name: itemName || 'Без названия', qty, price: price / qty, total });
    sale.totalAmount += total;
  }

  console.log(`   Уникальных продаж: ${salesMap.size}`);
  console.log(`   Отфильтровано (не артсвао.ру): ${filteredOut}`);

  // Загрузка существующих продаж для проверки дубликатов
  const existingSales = await prisma.archivedSale.findMany({
    select: { saleNumber: true, saleDate: true },
  });
  const existingSalesSet = new Set(
    existingSales.map(s => `${s.saleNumber}|${s.saleDate.toISOString()}`)
  );

  // Подготовка данных для batch создания
  const salesToCreate: any[] = [];

  for (const [saleDoc, saleData] of salesMap) {
    const parsed = parseSaleDocument(saleDoc);
    if (!parsed) continue;

    // Проверка дубликата
    const saleKey = `${parsed.number}|${parsed.date.toISOString()}`;
    if (existingSalesSet.has(saleKey)) {
      stats.sales.duplicates++;
      continue;
    }

    const client = findClientByName(saleData.clientName.trim().toLowerCase());
    if (!client) {
      stats.sales.clientNotFound++;
      continue;
    }

    salesToCreate.push({
      clientId: client.id,
      saleNumber: parsed.number,
      saleDate: parsed.date,
      sellerName: saleData.sellerName || null,
      totalAmount: new Prisma.Decimal(saleData.totalAmount),
      sourceDocument: saleDoc,
      items: saleData.items,
    });

    existingSalesSet.add(saleKey);
  }

  // Batch создание продаж
  if (salesToCreate.length > 0) {
    console.log(`   Создание ${salesToCreate.length} продаж...`);

    for (let i = 0; i < salesToCreate.length; i += BATCH_SIZE) {
      const batch = salesToCreate.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map(sale => prisma.archivedSale.create({
          data: {
            clientId: sale.clientId,
            saleNumber: sale.saleNumber,
            saleDate: sale.saleDate,
            sellerName: sale.sellerName,
            totalAmount: sale.totalAmount,
            sourceDocument: sale.sourceDocument,
            items: {
              create: sale.items.map((item: any) => ({
                itemName: item.name,
                quantity: new Prisma.Decimal(item.qty),
                unitPrice: new Prisma.Decimal(item.price),
                totalPrice: new Prisma.Decimal(item.total),
              })),
            },
          },
        }))
      );

      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= salesToCreate.length) {
        console.log(`   Обработано ${Math.min(i + BATCH_SIZE, salesToCreate.length)}/${salesToCreate.length}...`);
      }
    }

    stats.sales.imported += salesToCreate.length;
  }

  stats.sales.processed += salesMap.size;
  console.log(`   ✓ Импортировано: ${stats.sales.imported}`);
}

/**
 * Импорт оплат (оптимизировано с batch операциями)
 */
async function importPayments(year: string, stats: ImportStats) {
  console.log(`\n💳 Импорт оплат ${year}...`);

  const filePath = path.join(IMPORT_DIR, `Оплаты${year}.xlsx`);
  const paymentsData = readExcelFile(filePath, 6);
  console.log(`   Найдено ${paymentsData.length} записей в файле`);

  // Загрузка всех продаж в Map для O(1) поиска
  const allSales = await prisma.archivedSale.findMany({
    select: { id: true, saleNumber: true, saleDate: true },
  });
  const salesMap = new Map(
    allSales.map(s => [`${s.saleNumber}|${s.saleDate.toISOString()}`, s.id])
  );

  // Загрузка существующих оплат для проверки дубликатов
  const existingPayments = await prisma.archivedPayment.findMany({
    select: { archivedSaleId: true, amount: true, paymentMethod: true },
  });
  const existingPaymentsSet = new Set(
    existingPayments.map(p => `${p.archivedSaleId}|${p.amount.toString()}|${p.paymentMethod}`)
  );

  // Подготовка данных
  const paymentsToCreate: any[] = [];
  const paidAmountUpdates: Map<string, number> = new Map(); // saleId -> totalPaid

  for (const row of paymentsData) {
    const saleDoc = row['Основание оплаты'];
    const paymentMethod = row['Тип денежных средств'] || 'Неизвестно';
    const amount = parseFloat(row['Сумма оплачено']) || 0;

    if (!saleDoc || amount <= 0) continue;

    stats.payments.processed++;

    const parsed = parseSaleDocument(saleDoc);
    if (!parsed) continue;

    // O(1) поиск продажи
    const saleKey = `${parsed.number}|${parsed.date.toISOString()}`;
    const saleId = salesMap.get(saleKey);

    if (!saleId) {
      stats.payments.notFound++;
      continue;
    }

    // Проверка дубликата
    const paymentKey = `${saleId}|${amount}|${paymentMethod}`;
    if (existingPaymentsSet.has(paymentKey)) continue;

    existingPaymentsSet.add(paymentKey);

    paymentsToCreate.push({
      archivedSaleId: saleId,
      paymentMethod,
      amount: new Prisma.Decimal(amount),
      paymentDate: parsed.date,
      sourceDocument: saleDoc,
    });

    // Накапливаем суммы для batch обновления
    const currentTotal = paidAmountUpdates.get(saleId) || 0;
    paidAmountUpdates.set(saleId, currentTotal + amount);
  }

  // Batch создание оплат
  if (paymentsToCreate.length > 0) {
    console.log(`   Создание ${paymentsToCreate.length} оплат...`);

    for (let i = 0; i < paymentsToCreate.length; i += BATCH_SIZE) {
      const batch = paymentsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.archivedPayment.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    stats.payments.linked = paymentsToCreate.length;
  }

  // Batch обновление paidAmount в продажах
  if (paidAmountUpdates.size > 0) {
    console.log(`   Обновление сумм оплат в ${paidAmountUpdates.size} продажах...`);

    const updates = Array.from(paidAmountUpdates.entries());

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map(([saleId, amount]) => prisma.archivedSale.update({
          where: { id: saleId },
          data: { paidAmount: { increment: amount } },
        }))
      );
    }
  }

  console.log(`   ✓ Обработано: ${stats.payments.processed}`);
  console.log(`   ✓ Привязано: ${stats.payments.linked}`);
  console.log(`   ⚠️ Продажа не найдена: ${stats.payments.notFound}`);
}

/**
 * Основная функция импорта
 */
async function importExtendedData() {
  console.log('===========================================');
  console.log('🚀 ИМПОРТ РАСШИРЕННЫХ ДАННЫХ (ОПТИМИЗИРОВАННЫЙ)');
  console.log('===========================================');

  const startTime = Date.now();

  const stats: ImportStats = {
    benefitCategories: { created: 0, existing: 0 },
    benefitTags: { processed: 0, updated: 0, notFound: 0 },
    notes: { processed: 0, imported: 0, duplicates: 0, errors: 0 },
    sales: { processed: 0, imported: 0, duplicates: 0, clientNotFound: 0 },
    payments: { processed: 0, linked: 0, notFound: 0 },
  };

  try {
    // 0. Загрузка клиентов в память для O(1) поиска
    clientsMap = await loadClientsMap();

    // 1. Создание категорий льгот
    await ensureBenefitCategories(stats);

    // 2. Импорт тегов льгот
    await importBenefitTags(stats);

    // 3. Импорт заметок
    await importNotes(stats);

    // 4. Импорт продаж (по годам)
    for (const year of ['22', '23', '24', '25']) {
      await importSales(year, stats);
    }

    // 5. Импорт оплат (по годам)
    for (const year of ['22', '23', '24', '25']) {
      await importPayments(year, stats);
    }

    // Вывод итогов
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n===========================================');
    console.log('📈 ИТОГИ ИМПОРТА');
    console.log('===========================================');
    console.log(`⏱️  Время выполнения: ${duration} сек`);
    console.log('\n🏷️  Категории льгот:');
    console.log(`   Создано: ${stats.benefitCategories.created}`);
    console.log(`   Существовало: ${stats.benefitCategories.existing}`);
    console.log('\n📌 Теги льгот:');
    console.log(`   Обработано: ${stats.benefitTags.processed}`);
    console.log(`   Обновлено клиентов: ${stats.benefitTags.updated}`);
    console.log(`   Клиент не найден: ${stats.benefitTags.notFound}`);
    console.log('\n📝 Заметки:');
    console.log(`   Обработано: ${stats.notes.processed}`);
    console.log(`   Импортировано: ${stats.notes.imported}`);
    console.log(`   Дубликаты: ${stats.notes.duplicates}`);
    console.log(`   Ошибки: ${stats.notes.errors}`);
    console.log('\n🛒 Продажи:');
    console.log(`   Обработано: ${stats.sales.processed}`);
    console.log(`   Импортировано: ${stats.sales.imported}`);
    console.log(`   Дубликаты: ${stats.sales.duplicates}`);
    console.log(`   Клиент не найден: ${stats.sales.clientNotFound}`);
    console.log('\n💳 Оплаты:');
    console.log(`   Обработано: ${stats.payments.processed}`);
    console.log(`   Привязано к продажам: ${stats.payments.linked}`);
    console.log(`   Продажа не найдена: ${stats.payments.notFound}`);
    console.log('===========================================\n');

  } catch (error) {
    console.error('❌ Критическая ошибка импорта:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск импорта
importExtendedData().catch(console.error);
