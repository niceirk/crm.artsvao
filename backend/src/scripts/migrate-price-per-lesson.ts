/**
 * Скрипт миграции для пересчёта pricePerLesson у старых абонементов
 *
 * Проблема: у некоторых абонементов pricePerLesson = null, хотя при продаже
 * эта цена должна была сохраняться.
 *
 * Логика расчёта:
 * 1. Для каждого абонемента где pricePerLesson = null
 * 2. Посчитать количество занятий в группе за validMonth (от startDate до конца месяца)
 * 3. pricePerLesson = paidPrice / количество_занятий
 * 4. Обновить запись
 *
 * Запуск: npx tsx src/scripts/migrate-price-per-lesson.ts
 */

import { PrismaClient, CalendarEventStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function countSchedulesInMonth(
  groupId: string,
  validMonth: string,
  startDate: Date
): Promise<number> {
  const [year, month] = validMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Начинаем считать от даты покупки, но не раньше начала месяца
  const effectiveStart = startDate > monthStart ? startDate : monthStart;

  return prisma.schedule.count({
    where: {
      groupId,
      date: {
        gte: effectiveStart,
        lte: endOfMonth,
      },
      status: { not: CalendarEventStatus.CANCELLED },
      isRecurring: false,
    },
  });
}

async function main() {
  console.log('=== Миграция pricePerLesson для старых абонементов ===\n');

  // 1. Найти все абонементы где pricePerLesson = null и есть paidPrice
  // groupId и validMonth - обязательные поля, не нужно проверять на null
  const subscriptions = await prisma.subscription.findMany({
    where: {
      pricePerLesson: null,
      paidPrice: { gt: 0 },
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      subscriptionType: {
        select: {
          name: true,
          type: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`Найдено абонементов без pricePerLesson: ${subscriptions.length}\n`);

  if (subscriptions.length === 0) {
    console.log('Нет абонементов для миграции.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      const groupId = sub.groupId;
      const validMonth = sub.validMonth;
      const paidPrice = Number(sub.paidPrice);
      const startDate = new Date(sub.startDate);

      // Посчитать занятия в группе за месяц от даты покупки
      const schedulesCount = await countSchedulesInMonth(groupId, validMonth, startDate);

      if (schedulesCount === 0) {
        console.log(`⚠️  Пропуск: ${sub.client.lastName} ${sub.client.firstName} - ${sub.subscriptionType.name}`);
        console.log(`   Причина: нет занятий в группе ${sub.group?.name} за ${validMonth}`);
        skipped++;
        continue;
      }

      // Рассчитать pricePerLesson
      const pricePerLesson = Math.round(paidPrice / schedulesCount * 100) / 100;

      // Обновить запись
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { pricePerLesson },
      });

      console.log(`✅ ${sub.client.lastName} ${sub.client.firstName} - ${sub.subscriptionType.name}`);
      console.log(`   Группа: ${sub.group?.name}`);
      console.log(`   Месяц: ${validMonth}`);
      console.log(`   paidPrice: ${paidPrice} ₽`);
      console.log(`   Занятий в месяце: ${schedulesCount}`);
      console.log(`   pricePerLesson: ${pricePerLesson} ₽`);
      console.log('');

      updated++;
    } catch (error) {
      const errorMsg = `Ошибка для абонемента ${sub.id}: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n=== Итоги миграции ===');
  console.log(`Обновлено: ${updated}`);
  console.log(`Пропущено: ${skipped}`);
  console.log(`Ошибок: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nОшибки:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

main()
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
