import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('=== Проверка номеров счетов ===\n');

  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true, createdAt: true },
    orderBy: { invoiceNumber: 'asc' }
  });

  // Группируем по suffix (последняя часть после дефиса)
  const suffixMap = new Map<string, { id: string; invoiceNumber: string; createdAt: Date }[]>();

  for (const inv of invoices) {
    const parts = inv.invoiceNumber.split('-');
    const suffix = parts.length === 3 ? parts[2] : inv.invoiceNumber;

    if (!suffixMap.has(suffix)) {
      suffixMap.set(suffix, []);
    }
    suffixMap.get(suffix)!.push(inv);
  }

  // Находим дубликаты
  const duplicates: string[] = [];
  for (const [suffix, items] of suffixMap) {
    if (items.length > 1) {
      duplicates.push(suffix);
      console.log(`Дубликат suffix "${suffix}":`);
      for (const item of items) {
        const dateStr = item.createdAt.toISOString().split('T')[0];
        console.log(`  - ${item.invoiceNumber} (${dateStr})`);
      }
    }
  }

  console.log(`\nВсего счетов: ${invoices.length}`);
  console.log(`Дубликатов suffix: ${duplicates.length}`);

  // Показать все уникальные префиксы (года)
  const prefixes = new Set(invoices.map(i => {
    const parts = i.invoiceNumber.split('-');
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'new';
  }));
  console.log(`\nУникальные префиксы: ${Array.from(prefixes).join(', ')}`);

  await prisma.$disconnect();
}

main().catch(console.error);
