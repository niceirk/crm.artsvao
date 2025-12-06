/**
 * Скрипт миграции номеров заявок из формата "АР-25-000183" в "0000183"
 * Запуск: npx ts-node scripts/migrate-application-numbers.ts
 */
import { getCliPrismaClient, disconnectCliPrisma } from './lib/prisma-cli';

// Используем shared client с маленьким пулом соединений
const prisma = getCliPrismaClient();

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

  // Подготовка данных для батчевого обновления
  const updates = applications.map(app => {
    const parts = app.applicationNumber.split('-');
    const numericPart = parts[parts.length - 1];
    const number = parseInt(numericPart);
    const newNumber = number.toString().padStart(7, '0');
    return { id: app.id, oldNumber: app.applicationNumber, newNumber };
  });

  // Обрабатываем батчами по 100 записей
  const BATCH_SIZE = 100;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map(u => prisma.rentalApplication.update({
        where: { id: u.id },
        data: { applicationNumber: u.newNumber },
      }))
    );

    console.log(`Обработано ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length} заявок`);
  }

  console.log('Миграция завершена!');
}

main()
  .catch((e) => {
    console.error('Ошибка миграции:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectCliPrisma();
  });
