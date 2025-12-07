import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('=== ЗАВЕРШЕНИЕ МИГРАЦИИ ===\n');

  // 1. Находим максимальный номер
  const allInvoices = await prisma.invoice.findMany({
    select: { invoiceNumber: true }
  });

  let maxNumber = 0;
  for (const inv of allInvoices) {
    const num = parseInt(inv.invoiceNumber);
    if (!isNaN(num) && num > maxNumber) {
      maxNumber = num;
    }
  }
  console.log(`Максимальный номер: ${maxNumber}\n`);

  // 2. Конвертируем INV-... формат
  console.log('1. Конвертация INV-... формата...');

  const invFormat = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { startsWith: 'INV-' }
    },
    select: { id: true, invoiceNumber: true }
  });

  for (const inv of invFormat) {
    maxNumber++;
    const newNumber = maxNumber.toString().padStart(7, '0');

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceNumber: newNumber }
    });
    console.log(`   ${inv.invoiceNumber} → ${newNumber}`);
  }
  console.log(`   ✅ Сконвертировано: ${invFormat.length}\n`);

  // 3. Фикс битого номера
  console.log('2. Фикс битых номеров...');

  const broken = await prisma.invoice.findMany({
    where: {
      OR: [
        { invoiceNumber: { contains: 'NaN' } },
        { invoiceNumber: { contains: '-' } }
      ]
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
    console.log(`   ${inv.invoiceNumber} → ${newNumber}`);
  }
  console.log(`   ✅ Исправлено: ${broken.length}\n`);

  // 4. Конвертация статусов
  console.log('3. Конвертация статусов...');

  const statusResult = await prisma.$executeRaw`
    UPDATE invoices
    SET status = 'UNPAID'
    WHERE status IN ('PENDING', 'CANCELLED', 'DRAFT', 'OVERDUE')
  `;
  console.log(`   ✅ Обновлено ${statusResult} записей\n`);

  // 5. Проверка
  console.log('4. Итоговое состояние:');

  const finalFormats = await prisma.invoice.findMany({
    select: { invoiceNumber: true },
    orderBy: { invoiceNumber: 'desc' },
    take: 5
  });
  console.log('\n   Последние номера:', finalFormats.map(f => f.invoiceNumber).join(', '));

  const statusCounts = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count
    FROM invoices
    GROUP BY status
  ` as { status: string; count: bigint }[];

  console.log('\n   Статусы:');
  for (const row of statusCounts) {
    console.log(`   - ${row.status}: ${row.count}`);
  }

  // Проверка что нет старых форматов
  const oldFormats = await prisma.invoice.count({
    where: {
      OR: [
        { invoiceNumber: { contains: '-' } },
        { invoiceNumber: { contains: 'NaN' } }
      ]
    }
  });
  console.log(`\n   Счетов в старом формате: ${oldFormats}`);

  console.log('\n=== МИГРАЦИЯ ЗАВЕРШЕНА ===');

  await prisma.$disconnect();
}

main().catch(console.error);
