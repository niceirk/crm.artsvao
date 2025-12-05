/**
 * Скрипт миграции номеров заявок из формата "АР-25-000183" в "0000183"
 * Запуск: npx ts-node scripts/migrate-application-numbers.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Начинаем миграцию номеров заявок...');

  const applications = await prisma.rentalApplication.findMany({
    where: {
      applicationNumber: { contains: '-' },
    },
    select: {
      id: true,
      applicationNumber: true,
    },
  });

  console.log(`Найдено ${applications.length} заявок для миграции`);

  for (const app of applications) {
    // Извлекаем последнюю часть номера (например, "000183" из "АР-25-000183")
    const parts = app.applicationNumber.split('-');
    const numericPart = parts[parts.length - 1];
    const number = parseInt(numericPart);
    const newNumber = number.toString().padStart(7, '0');

    console.log(`${app.applicationNumber} -> ${newNumber}`);

    await prisma.rentalApplication.update({
      where: { id: app.id },
      data: { applicationNumber: newNumber },
    });
  }

  console.log('Миграция завершена!');
}

main()
  .catch((e) => {
    console.error('Ошибка миграции:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
