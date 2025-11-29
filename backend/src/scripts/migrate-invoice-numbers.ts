/**
 * Скрипт миграции номеров счетов
 * Переименовывает существующие счета из формата INV-YYYYMMDD-XXXX в МР-ГГ-NNNNNN
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Начало миграции номеров счетов...\n');

  // Получаем все счета, отсортированные по дате создания
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
    },
  });

  console.log(`📋 Найдено счетов: ${invoices.length}\n`);

  if (invoices.length === 0) {
    console.log('✅ Нет счетов для миграции');
    return;
  }

  // Группируем счета по году
  const byYear: Record<string, typeof invoices> = {};

  for (const invoice of invoices) {
    const year = invoice.createdAt.getFullYear().toString().slice(-2);
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(invoice);
  }

  // Переименовываем счета
  let totalUpdated = 0;

  for (const [year, yearInvoices] of Object.entries(byYear)) {
    console.log(`📅 Год 20${year}: ${yearInvoices.length} счетов`);

    let sequence = 1;
    for (const invoice of yearInvoices) {
      const newNumber = `МР-${year}-${sequence.toString().padStart(6, '0')}`;

      // Пропускаем если уже в новом формате
      if (invoice.invoiceNumber.startsWith('МР-')) {
        console.log(`  ⏭️  ${invoice.invoiceNumber} - уже в новом формате`);
        sequence++;
        continue;
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { invoiceNumber: newNumber },
      });

      console.log(`  ✅ ${invoice.invoiceNumber} → ${newNumber}`);
      sequence++;
      totalUpdated++;
    }
  }

  console.log(`\n🎉 Миграция завершена! Обновлено счетов: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка миграции:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
