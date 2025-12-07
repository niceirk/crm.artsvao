import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('=== РЕЗУЛЬТАТ МИГРАЦИИ ===\n');

  // Статусы
  const statusCounts = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count
    FROM invoices
    GROUP BY status
  ` as { status: string; count: bigint }[];

  console.log('Статусы:');
  for (const row of statusCounts) {
    console.log(`  - ${row.status}: ${row.count}`);
  }

  // Номера
  const invoices = await prisma.invoice.findMany({
    select: { invoiceNumber: true, status: true },
    orderBy: { invoiceNumber: 'desc' },
    take: 5
  });
  console.log('\nПоследние номера:');
  console.table(invoices);

  // Проверка старых форматов
  const oldFormats = await prisma.invoice.count({
    where: {
      OR: [
        { invoiceNumber: { contains: '-' } },
        { invoiceNumber: { contains: 'NaN' } }
      ]
    }
  });
  console.log(`\nСчетов в старом формате: ${oldFormats}`);

  await prisma.$disconnect();
}

main().catch(console.error);
