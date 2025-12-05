// backend/scripts/migrate-old-applications.ts
// Скрипт миграции заявок со старого формата АР-25-XXXXXX на новый 0000XXX

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateOldApplications() {
  // 1. Найти все заявки со старым форматом АР-...
  const oldApplications = await prisma.rentalApplication.findMany({
    where: {
      applicationNumber: { contains: '-' }
    },
    include: {
      rentals: true,
      workspaces: true,
      selectedDays: true,
      client: { select: { lastName: true, firstName: true } },
      room: { select: { name: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Найдено ${oldApplications.length} заявок со старым форматом`);

  if (oldApplications.length === 0) {
    console.log('Нечего мигрировать');
    return;
  }

  // Вывести список для проверки
  for (const app of oldApplications) {
    console.log(`  ${app.applicationNumber}: ${app.client.lastName} ${app.client.firstName} → ${app.room?.name || 'без комнаты'}`);
  }

  // 2. Группировка по clientId + roomId
  const groups = new Map<string, typeof oldApplications>();
  for (const app of oldApplications) {
    const key = `${app.clientId}:${app.roomId || 'null'}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(app);
  }

  console.log(`\nСформировано ${groups.size} групп для склейки:`);
  for (const [key, apps] of groups) {
    console.log(`  ${key}: ${apps.length} заявок`);
  }

  // 3. Получить последний номер в новом формате
  const lastNewFormat = await prisma.rentalApplication.findFirst({
    where: { applicationNumber: { not: { contains: '-' } } },
    orderBy: { applicationNumber: 'desc' }
  });
  let nextNumber = lastNewFormat
    ? parseInt(lastNewFormat.applicationNumber) + 1
    : 1;

  console.log(`\nНачинаем нумерацию с: ${String(nextNumber).padStart(7, '0')}`);

  // 4. Обработка каждой группы
  for (const [key, apps] of groups) {
    if (apps.length === 1) {
      // Только одна заявка - просто обновить номер
      const newNumber = String(nextNumber++).padStart(7, '0');
      await prisma.rentalApplication.update({
        where: { id: apps[0].id },
        data: { applicationNumber: newNumber }
      });
      console.log(`\n✓ Обновлён номер: ${apps[0].applicationNumber} → ${newNumber}`);
      continue;
    }

    // Склейка нескольких заявок
    const [main, ...others] = apps;
    const newNumber = String(nextNumber++).padStart(7, '0');

    console.log(`\n⚡ Склейка ${apps.length} заявок в ${newNumber}:`);
    console.log(`   Главная: ${main.applicationNumber}`);
    console.log(`   Удаляемые: ${others.map(o => o.applicationNumber).join(', ')}`);

    await prisma.$transaction(async (tx) => {
      const otherIds = others.map(o => o.id);

      // Переназначить все Rental записи одним запросом
      const updatedRentals = await tx.rental.updateMany({
        where: { rentalApplicationId: { in: otherIds } },
        data: { rentalApplicationId: main.id }
      });
      console.log(`   Перенесено ${updatedRentals.count} Rental записей`);

      // Подсчитать новое количество слотов
      const allRentals = await tx.rental.findMany({
        where: { rentalApplicationId: main.id }
      });

      const quantity = allRentals.length || 1;
      const totalPrice = new Prisma.Decimal(main.basePrice.toString()).mul(quantity);

      // Найти границы дат
      let startDate = main.startDate;
      let endDate = main.endDate || main.startDate;

      if (allRentals.length > 0) {
        const dates = allRentals.map(r => r.date.getTime());
        startDate = new Date(Math.min(...dates));
        endDate = new Date(Math.max(...dates));
      }

      // Обновить главную заявку
      await tx.rentalApplication.update({
        where: { id: main.id },
        data: {
          applicationNumber: newNumber,
          quantity: new Prisma.Decimal(quantity),
          totalPrice,
          startDate,
          endDate
        }
      });

      // Удалить связи одним запросом
      await tx.rentalApplicationWorkspace.deleteMany({
        where: { rentalApplicationId: { in: otherIds } }
      });
      await tx.rentalApplicationDay.deleteMany({
        where: { rentalApplicationId: { in: otherIds } }
      });

      // Удалить лишние заявки одним запросом
      await tx.rentalApplication.deleteMany({
        where: { id: { in: otherIds } }
      });

      console.log(`   ✓ Результат: ${quantity} слотов, ${totalPrice} руб.`);
    }, { timeout: 60000 }); // Увеличен таймаут до 60 секунд
  }

  console.log('\n✅ Миграция завершена!');
}

migrateOldApplications()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
