/**
 * Скрипт импорта абонементов из Excel
 *
 * Использование:
 *   npx ts-node scripts/import-subscriptions.ts --dry-run  # Только показать что будет сделано
 *   npx ts-node scripts/import-subscriptions.ts            # Выполнить импорт
 */

import { PrismaClient, ServiceType, WriteOffTiming } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// Проверка флага dry-run
const isDryRun = process.argv.includes('--dry-run');

// Путь к файлу Excel
const EXCEL_FILE = path.join(__dirname, '../../Импорт.xlsx');

// Маппинг месяцев
const MONTH_MAP: Record<string, { month: number; year: number }> = {
  'Декабря': { month: 12, year: 2025 },
  'Ноябрь': { month: 11, year: 2025 },
  'Октябрь': { month: 10, year: 2025 },
  'Сентябрь': { month: 9, year: 2025 },
};

interface ExcelRow {
  'Группа': string;
  'ФИО': string;
  'Абонемент': string;
  'Декабря': number | undefined;
  'Ноябрь': number | undefined;
  'Октябрь': number | undefined;
  'Сентябрь': number | undefined;
}

interface ImportResult {
  success: number;
  errors: string[];
  subscriptions: Array<{
    client: string;
    month: string;
    price: number;
    subscriptionId?: string;
    invoiceNumber?: string;
  }>;
}

/**
 * Нормализация строки: замена ё на е, trim
 */
function normalizeString(str: string): string {
  return str.trim().replace(/ё/g, 'е').replace(/Ё/g, 'Е');
}

/**
 * Парсинг ФИО из строки
 * Форматы: "Фамилия Имя Отчество" или "Фамилия Имя"
 */
function parseFIO(fio: string): { lastName: string; firstName: string; middleName?: string } {
  const parts = normalizeString(fio).split(/\s+/);

  if (parts.length >= 3) {
    return {
      lastName: parts[0],
      firstName: parts[1],
      middleName: parts.slice(2).join(' '),
    };
  } else if (parts.length === 2) {
    return {
      lastName: parts[0],
      firstName: parts[1],
    };
  } else {
    // Одно слово - считаем фамилией
    return {
      lastName: parts[0],
      firstName: '',
    };
  }
}

/**
 * Генерация номера счета
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `МР-${year}`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * Получить последний день месяца
 */
function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Форматирование месяца для validMonth
 */
function formatValidMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Название месяца на русском
 */
function getMonthName(month: number): string {
  const names = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return names[month];
}

// Кэши для групп и типов абонементов
const groupCache = new Map<string, { id: string; name: string }>();
const subTypeCache = new Map<string, { id: string; name: string; groupId: string }>();

async function getGroup(groupName: string) {
  const normalized = normalizeString(groupName);
  if (groupCache.has(normalized)) {
    return groupCache.get(normalized)!;
  }

  const group = await prisma.group.findFirst({
    where: { name: { contains: normalized, mode: 'insensitive' } },
    select: { id: true, name: true },
  });

  if (group) {
    groupCache.set(normalized, group);
  }
  return group;
}

async function getSubscriptionType(subTypeName: string, groupId: string) {
  const cacheKey = `${normalizeString(subTypeName)}:${groupId}`;
  if (subTypeCache.has(cacheKey)) {
    return subTypeCache.get(cacheKey)!;
  }

  let subType = await prisma.subscriptionType.findFirst({
    where: {
      name: { contains: normalizeString(subTypeName), mode: 'insensitive' },
      groupId,
    },
    select: { id: true, name: true, groupId: true },
  });

  // Если не найден, берем любой активный для группы
  if (!subType) {
    subType = await prisma.subscriptionType.findFirst({
      where: { groupId, isActive: true },
      select: { id: true, name: true, groupId: true },
    });
  }

  if (subType) {
    subTypeCache.set(cacheKey, subType);
  }
  return subType;
}

async function main() {
  console.log('='.repeat(60));
  console.log('ИМПОРТ АБОНЕМЕНТОВ ИЗ EXCEL');
  console.log('='.repeat(60));
  console.log(`Режим: ${isDryRun ? 'DRY-RUN (без реальных изменений)' : 'РЕАЛЬНЫЙ ИМПОРТ'}`);
  console.log(`Файл: ${EXCEL_FILE}`);
  console.log('');

  // 1. Читаем Excel файл
  console.log('📖 Чтение Excel файла...');
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`   Найдено строк: ${rows.length}`);

  // 2. Собираем уникальные группы для предзагрузки
  const uniqueGroups = [...new Set(rows.map(r => r['Группа']).filter(Boolean))];
  console.log(`\n📋 Уникальных групп: ${uniqueGroups.length}`);
  for (const gn of uniqueGroups) {
    console.log(`   - ${gn}`);
  }

  // 3. Обрабатываем каждую строку
  const result: ImportResult = {
    success: 0,
    errors: [],
    subscriptions: [],
  };

  console.log('\n' + '='.repeat(60));
  console.log('ОБРАБОТКА КЛИЕНТОВ');
  console.log('='.repeat(60));

  for (const row of rows) {
    const fio = row['ФИО'];
    const rowGroupName = row['Группа'];
    const rowSubTypeName = row['Абонемент'];
    const { lastName, firstName } = parseFIO(fio);

    console.log(`\n👤 ${fio} [${rowGroupName}]`);

    // Находим группу для этой строки
    const group = await getGroup(rowGroupName);
    if (!group) {
      const error = `   ❌ Группа не найдена: ${rowGroupName}`;
      console.log(error);
      result.errors.push(error);
      continue;
    }

    // Находим тип абонемента для этой строки
    const subType = await getSubscriptionType(rowSubTypeName, group.id);
    if (!subType) {
      const error = `   ❌ Тип абонемента не найден: ${rowSubTypeName} для группы ${rowGroupName}`;
      console.log(error);
      result.errors.push(error);
      continue;
    }

    // Поиск клиента
    const client = await prisma.client.findFirst({
      where: {
        AND: [
          { lastName: { equals: lastName, mode: 'insensitive' } },
          firstName ? { firstName: { contains: firstName, mode: 'insensitive' } } : {},
        ],
      },
    });

    if (!client) {
      const error = `   ❌ Клиент не найден: ${fio}`;
      console.log(error);
      result.errors.push(error);
      continue;
    }
    console.log(`   ✅ Найден: ${client.lastName} ${client.firstName} (${client.id})`);

    // Проверяем/добавляем в группу
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_clientId: {
          groupId: group.id,
          clientId: client.id,
        },
      },
    });

    if (!existingMember && !isDryRun) {
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          clientId: client.id,
          status: 'ACTIVE',
        },
      });
      console.log(`   ➕ Добавлен в группу ${group.name}`);
    } else if (!existingMember) {
      console.log(`   ➕ [DRY-RUN] Будет добавлен в группу ${group.name}`);
    }

    // Обрабатываем каждый месяц
    for (const [columnName, monthInfo] of Object.entries(MONTH_MAP)) {
      const price = row[columnName as keyof ExcelRow] as number | undefined;

      if (price && price > 0) {
        const validMonth = formatValidMonth(monthInfo.year, monthInfo.month);
        const startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
        const endDate = getLastDayOfMonth(monthInfo.year, monthInfo.month);
        const monthName = getMonthName(monthInfo.month);

        console.log(`   📅 ${monthName} ${monthInfo.year}: ${price} ₽`);

        if (isDryRun) {
          result.subscriptions.push({
            client: fio,
            month: `${monthName} ${monthInfo.year}`,
            price,
          });
          result.success++;
        } else {
          try {
            // Создаем абонемент и счет в транзакции
            const invoiceNumber = await generateInvoiceNumber();

            const { subscription, invoice } = await prisma.$transaction(async (tx) => {
              // Создаем абонемент
              const subscription = await tx.subscription.create({
                data: {
                  clientId: client.id,
                  subscriptionTypeId: subType.id,
                  groupId: group.id,
                  validMonth,
                  purchaseDate: startDate,
                  startDate,
                  endDate,
                  originalPrice: price,
                  discountAmount: 0,
                  paidPrice: price,
                  pricePerLesson: null,
                  vatRate: 0,
                  vatAmount: 0,
                  status: 'ACTIVE',
                  purchasedMonths: 1,
                },
              });

              // Создаем счет
              const invoice = await tx.invoice.create({
                data: {
                  invoiceNumber,
                  clientId: client.id,
                  subscriptionId: subscription.id,
                  subtotal: price,
                  discountAmount: 0,
                  totalAmount: price,
                  status: 'PENDING',
                  issuedAt: new Date(),
                  items: {
                    create: {
                      serviceType: ServiceType.SUBSCRIPTION,
                      serviceName: `${subType.name} - ${monthName} ${monthInfo.year}`,
                      groupId: group.id,
                      quantity: 1,
                      unitPrice: price,
                      basePrice: price,
                      vatRate: 0,
                      vatAmount: 0,
                      discountPercent: 0,
                      discountAmount: 0,
                      totalPrice: price,
                      writeOffTiming: WriteOffTiming.ON_SALE,
                    },
                  },
                },
              });

              return { subscription, invoice };
            });

            result.subscriptions.push({
              client: fio,
              month: `${monthName} ${monthInfo.year}`,
              price,
              subscriptionId: subscription.id,
              invoiceNumber: invoice.invoiceNumber,
            });
            result.success++;
            console.log(`      ✅ Создано: абонемент ${subscription.id.slice(0, 8)}..., счет ${invoice.invoiceNumber}`);
          } catch (err) {
            const error = `      ❌ Ошибка: ${err}`;
            console.log(error);
            result.errors.push(`${fio} - ${monthName}: ${err}`);
          }
        }
      }
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('ИТОГОВЫЙ ОТЧЕТ');
  console.log('='.repeat(60));
  console.log(`Успешно: ${result.success}`);
  console.log(`Ошибок: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nОшибки:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  if (isDryRun) {
    console.log('\n📋 Что будет создано:');
    result.subscriptions.forEach(s => {
      console.log(`  - ${s.client}: ${s.month} - ${s.price} ₽`);
    });
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
