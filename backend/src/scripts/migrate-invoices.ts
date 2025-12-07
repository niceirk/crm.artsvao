import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('=== МИГРАЦИЯ СЧЕТОВ ===\n');

  // 1. Находим максимальный существующий номер в 7-digit формате
  const existingNew = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { not: { contains: '-' } }
    },
    select: { id: true, invoiceNumber: true }
  });

  let maxNumber = 0;
  const existingNumbers = new Set<number>();

  for (const inv of existingNew) {
    const num = parseInt(inv.invoiceNumber);
    if (!isNaN(num)) {
      existingNumbers.add(num);
      if (num > maxNumber) maxNumber = num;
    }
  }

  console.log(`1. Уже в новом формате: ${existingNew.length} счетов`);
  console.log(`   Максимальный номер: ${maxNumber}`);
  console.log(`   Занятые номера: ${Array.from(existingNumbers).sort((a, b) => a - b).join(', ')}\n`);

  // 2. Конвертируем МР-25-XXXXXX
  console.log('2. Конвертация МР-25-XXXXXX...');

  const oldFormat = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { startsWith: 'МР-' }
    },
    select: { id: true, invoiceNumber: true },
    orderBy: { invoiceNumber: 'asc' }
  });

  console.log(`   Найдено ${oldFormat.length} счетов`);

  let converted = 0;
  for (const inv of oldFormat) {
    const parts = inv.invoiceNumber.split('-');
    let targetNum = parseInt(parts[2] || '0');

    // Если номер уже занят - берём следующий свободный
    while (existingNumbers.has(targetNum)) {
      targetNum = maxNumber + 1;
      maxNumber = targetNum;
    }

    const newNumber = targetNum.toString().padStart(7, '0');
    existingNumbers.add(targetNum);

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceNumber: newNumber }
    });
    converted++;
  }
  console.log(`   ✅ Сконвертировано: ${converted}\n`);

  // 3. Конвертируем INV-... формат
  console.log('3. Конвертация INV-... формата...');

  const invFormat = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { startsWith: 'INV-' }
    },
    select: { id: true, invoiceNumber: true }
  });

  for (const inv of invFormat) {
    maxNumber++;
    const newNumber = maxNumber.toString().padStart(7, '0');
    existingNumbers.add(maxNumber);

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceNumber: newNumber }
    });
  }
  console.log(`   ✅ Сконвертировано: ${invFormat.length}\n`);

  // 4. Фикс битого номера 0000NaN
  console.log('4. Фикс битых номеров...');

  const broken = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { contains: 'NaN' }
    },
    select: { id: true, invoiceNumber: true }
  });

  for (const inv of broken) {
    maxNumber++;
    const newNumber = maxNumber.toString().padStart(7, '0');

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceNumber: newNumber }
    });
  }
  console.log(`   ✅ Исправлено: ${broken.length}\n`);

  // 5. Конвертация статусов
  console.log('5. Конвертация статусов (PENDING, CANCELLED, DRAFT, OVERDUE → UNPAID)...');

  const statusResult = await prisma.$executeRaw`
    UPDATE invoices
    SET status = 'UNPAID'
    WHERE status IN ('PENDING', 'CANCELLED', 'DRAFT', 'OVERDUE')
  `;
  console.log(`   ✅ Обновлено ${statusResult} записей\n`);

  // 6. Проверка результатов
  console.log('6. Проверка результатов:');

  const finalInvoices = await prisma.invoice.findMany({
    select: { invoiceNumber: true, status: true },
    orderBy: { invoiceNumber: 'desc' },
    take: 10
  });
  console.log('\n   Последние 10 счетов:');
  console.table(finalInvoices);

  const statusCounts = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count
    FROM invoices
    GROUP BY status
  ` as { status: string; count: bigint }[];

  console.log('\n   Статусы:');
  for (const row of statusCounts) {
    console.log(`   - ${row.status}: ${row.count}`);
  }

  console.log('\n=== МИГРАЦИЯ ЗАВЕРШЕНА ===');

  await prisma.$disconnect();
}

main().catch(console.error);
