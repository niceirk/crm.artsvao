import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('=== Форматы номеров счетов ===\n');

  const invoices = await prisma.invoice.findMany({
    select: { invoiceNumber: true },
    orderBy: { createdAt: 'desc' }
  });

  // Группируем по формату
  const formats: Record<string, string[]> = {
    'МР-ГГ-XXXXXX': [],
    'INV-XXXXXX': [],
    '7-digit': [],
    'other': []
  };

  for (const inv of invoices) {
    const num = inv.invoiceNumber;
    if (num.match(/^МР-\d{2}-\d+$/)) {
      formats['МР-ГГ-XXXXXX'].push(num);
    } else if (num.match(/^INV-/)) {
      formats['INV-XXXXXX'].push(num);
    } else if (num.match(/^\d{7}$/)) {
      formats['7-digit'].push(num);
    } else {
      formats['other'].push(num);
    }
  }

  for (const [format, nums] of Object.entries(formats)) {
    console.log(`${format}: ${nums.length} шт`);
    if (nums.length > 0 && nums.length <= 5) {
      console.log(`  Примеры: ${nums.join(', ')}`);
    } else if (nums.length > 5) {
      console.log(`  Примеры: ${nums.slice(0, 3).join(', ')} ... ${nums.slice(-2).join(', ')}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
