import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseSaleDocument } from './import-utils';

const prisma = new PrismaClient();
const IMPORT_DIR = path.join(__dirname, '../../../import');

// Тестовые клиенты для импорта
const TEST_CLIENTS = [
  'Козлова Елизавета Анатольевна',
  'Козлова Екатерина Анатольевна',
];

function normalizeClientName(name: string): string {
  return name.trim().toLowerCase();
}

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

async function testImport() {
  console.log('===========================================');
  console.log('🧪 ТЕСТОВЫЙ ИМПОРТ ПРОДАЖ И ОПЛАТ');
  console.log('===========================================');
  console.log('Клиенты для импорта:');
  TEST_CLIENTS.forEach(c => console.log(`  - ${c}`));
  console.log('');

  // Загрузка клиентов
  const clients = await prisma.client.findMany({
    where: {
      lastName: 'Козлова',
      firstName: { in: ['Елизавета', 'Екатерина'] }
    },
    select: { id: true, firstName: true, lastName: true, middleName: true }
  });

  const clientsMap = new Map<string, string>();
  for (const c of clients) {
    const key = normalizeClientName(`${c.lastName} ${c.firstName} ${c.middleName || ''}`);
    clientsMap.set(key, c.id);
    console.log(`📋 Найден клиент: ${c.lastName} ${c.firstName} ${c.middleName || ''} (ID: ${c.id})`);
  }

  const testClientNames = new Set(TEST_CLIENTS.map(n => normalizeClientName(n)));

  // === ИМПОРТ ПРОДАЖ ===
  console.log('\n🛒 ПОИСК ПРОДАЖ В ФАЙЛАХ...');

  const allSalesFound: any[] = [];

  for (const year of ['22', '23', '24', '25']) {
    const filePath = path.join(IMPORT_DIR, `Продажи${year}.xlsx`);
    const headerRow = year === '25' ? 7 : 6;

    try {
      const salesData = readExcelFile(filePath, headerRow);
      console.log(`\n📄 Продажи${year}.xlsx: всего ${salesData.length} записей`);

      // Найдем записи для наших клиентов
      let foundCount = 0;

      for (const row of salesData) {
        const clientName = row['Клиент'];
        if (!clientName) continue;

        const normalizedName = normalizeClientName(clientName);

        if (testClientNames.has(normalizedName)) {
          foundCount++;
          allSalesFound.push({
            year,
            clientName,
            saleDoc: row['Документ продажи'],
            itemName: row['Номенклатура'],
            qty: row['Количество'],
            price: row['Стоимость'],
            structUnit: row['Структурная единица'],
            seller: row['Продавец']
          });
        }
      }

      console.log(`   Найдено записей для тестовых клиентов: ${foundCount}`);
    } catch (e) {
      console.log(`   ⚠️ Ошибка чтения файла: ${e}`);
    }
  }

  // Вывод найденных продаж
  console.log('\n📊 НАЙДЕННЫЕ ПРОДАЖИ:');
  console.log('='.repeat(120));

  // Группировка по документам продажи
  const salesByDoc = new Map<string, any[]>();
  for (const sale of allSalesFound) {
    const key = sale.saleDoc;
    if (!salesByDoc.has(key)) {
      salesByDoc.set(key, []);
    }
    salesByDoc.get(key)!.push(sale);
  }

  console.log(`Уникальных документов продажи: ${salesByDoc.size}\n`);

  for (const [saleDoc, items] of salesByDoc) {
    const parsed = parseSaleDocument(saleDoc);
    const clientName = items[0].clientName;
    const structUnit = items[0].structUnit;
    const seller = items[0].seller;

    console.log(`\n📑 ${saleDoc}`);
    console.log(`   Клиент: ${clientName}`);
    console.log(`   Структурная единица: ${structUnit}`);
    console.log(`   Продавец: ${seller}`);
    console.log(`   Парсинг документа: ${parsed ? `номер=${parsed.number}, дата=${parsed.date.toISOString().split('T')[0]}` : 'ОШИБКА ПАРСИНГА'}`);
    console.log(`   Позиции:`);

    let total = 0;
    for (const item of items) {
      console.log(`     - ${item.itemName}: кол-во ${item.qty}, цена ${item.price}`);
      total += parseFloat(item.price) || 0;
    }
    console.log(`   ИТОГО: ${total} руб.`);
  }

  // === ПОИСК ОПЛАТ ===
  console.log('\n\n💳 ПОИСК ОПЛАТ В ФАЙЛАХ...');

  const allPaymentsFound: any[] = [];
  const saleDocsSet = new Set(salesByDoc.keys());

  for (const year of ['22', '23', '24', '25']) {
    const filePath = path.join(IMPORT_DIR, `Оплаты${year}.xlsx`);

    try {
      const paymentsData = readExcelFile(filePath, 6);
      console.log(`\n📄 Оплаты${year}.xlsx: всего ${paymentsData.length} записей`);

      let foundCount = 0;

      for (const row of paymentsData) {
        const saleDoc = row['Основание оплаты'];
        if (!saleDoc) continue;

        // Проверяем, относится ли оплата к одной из найденных продаж
        if (saleDocsSet.has(saleDoc)) {
          foundCount++;
          allPaymentsFound.push({
            year,
            saleDoc,
            paymentMethod: row['Тип денежных средств'],
            amount: row['Сумма оплачено'],
            client: row['Клиент']
          });
        }
      }

      console.log(`   Найдено оплат для тестовых продаж: ${foundCount}`);
    } catch (e) {
      console.log(`   ⚠️ Ошибка чтения файла: ${e}`);
    }
  }

  // Вывод найденных оплат
  console.log('\n📊 НАЙДЕННЫЕ ОПЛАТЫ:');
  console.log('='.repeat(80));

  for (const payment of allPaymentsFound) {
    console.log(`   ${payment.saleDoc}`);
    console.log(`     Способ: ${payment.paymentMethod}, Сумма: ${payment.amount}`);
  }

  // === ТЕСТОВЫЙ ИМПОРТ ===
  console.log('\n\n🚀 ВЫПОЛНЕНИЕ ТЕСТОВОГО ИМПОРТА...');

  // Фильтруем только артсвао.ру
  const artsvaoSales = Array.from(salesByDoc.entries()).filter(([doc, items]) => {
    const structUnit = items[0].structUnit;
    return structUnit && structUnit.trim().toLowerCase() === 'артсвао.ру';
  });

  console.log(`Продаж для артсвао.ру: ${artsvaoSales.length} из ${salesByDoc.size}`);

  // Проверяем существующие продажи
  const existingSales = await prisma.archivedSale.findMany({
    where: {
      clientId: { in: Array.from(clientsMap.values()) }
    },
    include: {
      items: true,
      payments: true,
      client: { select: { firstName: true, lastName: true } }
    }
  });

  console.log(`\n📦 Уже существующих продаж для этих клиентов: ${existingSales.length}`);

  for (const sale of existingSales) {
    console.log(`   - ${sale.saleNumber} от ${sale.saleDate.toISOString().split('T')[0]}: ${sale.totalAmount} руб. (${sale.client.lastName} ${sale.client.firstName})`);
    for (const item of sale.items) {
      console.log(`     * ${item.itemName}: ${item.quantity} x ${item.unitPrice} = ${item.totalPrice}`);
    }
    for (const payment of sale.payments) {
      console.log(`     💰 ${payment.paymentMethod}: ${payment.amount} руб.`);
    }
  }

  // Создаем продажи которых еще нет
  let importedSales = 0;
  let skippedDuplicates = 0;

  const existingSalesSet = new Set(
    existingSales.map(s => `${s.saleNumber}|${s.saleDate.toISOString()}`)
  );

  for (const [saleDoc, items] of artsvaoSales) {
    const parsed = parseSaleDocument(saleDoc);
    if (!parsed) {
      console.log(`   ⚠️ Не удалось распарсить: ${saleDoc}`);
      continue;
    }

    const saleKey = `${parsed.number}|${parsed.date.toISOString()}`;
    if (existingSalesSet.has(saleKey)) {
      skippedDuplicates++;
      console.log(`   ⏭️ Дубликат: ${saleDoc}`);
      continue;
    }

    const clientName = normalizeClientName(items[0].clientName);
    const clientId = clientsMap.get(clientName);

    if (!clientId) {
      console.log(`   ⚠️ Клиент не найден: ${items[0].clientName}`);
      continue;
    }

    // Подготовка позиций
    const saleItems = items.map(item => ({
      itemName: item.itemName || 'Без названия',
      quantity: new Prisma.Decimal(parseFloat(item.qty) || 1),
      unitPrice: new Prisma.Decimal((parseFloat(item.price) || 0) / (parseFloat(item.qty) || 1)),
      totalPrice: new Prisma.Decimal(parseFloat(item.price) || 0),
    }));

    const totalAmount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) || 0), 0);

    // Создание продажи
    const newSale = await prisma.archivedSale.create({
      data: {
        clientId,
        saleNumber: parsed.number,
        saleDate: parsed.date,
        sellerName: items[0].seller || null,
        totalAmount: new Prisma.Decimal(totalAmount),
        sourceDocument: saleDoc,
        items: {
          create: saleItems
        }
      },
      include: { items: true }
    });

    console.log(`   ✅ Создана продажа: ${saleDoc} (${newSale.items.length} позиций, ${totalAmount} руб.)`);
    importedSales++;
    existingSalesSet.add(saleKey);
  }

  // Импорт оплат
  console.log('\n💳 ИМПОРТ ОПЛАТ...');

  // Загрузка всех продаж для привязки оплат
  const allClientSales = await prisma.archivedSale.findMany({
    where: { clientId: { in: Array.from(clientsMap.values()) } },
    select: { id: true, saleNumber: true, saleDate: true }
  });

  const salesLookup = new Map(
    allClientSales.map(s => [`${s.saleNumber}|${s.saleDate.toISOString()}`, s.id])
  );

  // Загрузка существующих оплат
  const existingPayments = await prisma.archivedPayment.findMany({
    where: { archivedSaleId: { in: allClientSales.map(s => s.id) } },
    select: { archivedSaleId: true, amount: true, paymentMethod: true }
  });

  const existingPaymentsSet = new Set(
    existingPayments.map(p => `${p.archivedSaleId}|${p.amount.toString()}|${p.paymentMethod}`)
  );

  let importedPayments = 0;
  let skippedPayments = 0;

  for (const payment of allPaymentsFound) {
    const parsed = parseSaleDocument(payment.saleDoc);
    if (!parsed) continue;

    const saleKey = `${parsed.number}|${parsed.date.toISOString()}`;
    const saleId = salesLookup.get(saleKey);

    if (!saleId) {
      console.log(`   ⚠️ Продажа не найдена для оплаты: ${payment.saleDoc}`);
      continue;
    }

    const amount = parseFloat(payment.amount) || 0;
    const paymentKey = `${saleId}|${amount}|${payment.paymentMethod}`;

    if (existingPaymentsSet.has(paymentKey)) {
      skippedPayments++;
      continue;
    }

    await prisma.archivedPayment.create({
      data: {
        archivedSaleId: saleId,
        paymentMethod: payment.paymentMethod || 'Неизвестно',
        amount: new Prisma.Decimal(amount),
        paymentDate: parsed.date,
        sourceDocument: payment.saleDoc
      }
    });

    // Обновляем paidAmount в продаже
    await prisma.archivedSale.update({
      where: { id: saleId },
      data: { paidAmount: { increment: amount } }
    });

    console.log(`   ✅ Оплата: ${payment.paymentMethod} - ${amount} руб.`);
    importedPayments++;
    existingPaymentsSet.add(paymentKey);
  }

  // Итоги
  console.log('\n===========================================');
  console.log('📊 ИТОГИ ТЕСТОВОГО ИМПОРТА');
  console.log('===========================================');
  console.log(`Продажи:`);
  console.log(`  - Импортировано: ${importedSales}`);
  console.log(`  - Дубликаты (пропущено): ${skippedDuplicates}`);
  console.log(`Оплаты:`);
  console.log(`  - Импортировано: ${importedPayments}`);
  console.log(`  - Дубликаты (пропущено): ${skippedPayments}`);

  // Финальный вывод данных клиентов
  console.log('\n📋 ИТОГОВЫЕ ДАННЫЕ КЛИЕНТОВ:');

  const finalSales = await prisma.archivedSale.findMany({
    where: { clientId: { in: Array.from(clientsMap.values()) } },
    include: {
      items: true,
      payments: true,
      client: { select: { firstName: true, lastName: true, middleName: true } }
    },
    orderBy: { saleDate: 'desc' }
  });

  for (const sale of finalSales) {
    console.log(`\n📦 ${sale.client.lastName} ${sale.client.firstName} ${sale.client.middleName || ''}`);
    console.log(`   Продажа №${sale.saleNumber} от ${sale.saleDate.toISOString().split('T')[0]}`);
    console.log(`   Сумма: ${sale.totalAmount} руб., Оплачено: ${sale.paidAmount} руб.`);
    console.log(`   Продавец: ${sale.sellerName || 'Не указан'}`);
    console.log(`   Позиции:`);
    for (const item of sale.items) {
      console.log(`     - ${item.itemName}: ${item.quantity} x ${item.unitPrice} = ${item.totalPrice} руб.`);
    }
    if (sale.payments.length > 0) {
      console.log(`   Оплаты:`);
      for (const payment of sale.payments) {
        console.log(`     💰 ${payment.paymentMethod}: ${payment.amount} руб.`);
      }
    }
  }

  await prisma.$disconnect();
}

testImport().catch(e => {
  console.error('❌ Ошибка:', e);
  prisma.$disconnect();
});
