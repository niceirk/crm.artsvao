/**
 * Скрипт удаления дубликатов абонементов
 *
 * Находит и удаляет дубликаты абонементов, которые были созданы по ошибке
 * при смене статуса счетов на PAID.
 *
 * Использование:
 *   npx ts-node scripts/remove-duplicate-subscriptions.ts --dry-run  # Только показать дубликаты
 *   npx ts-node scripts/remove-duplicate-subscriptions.ts            # Удалить дубликаты
 */

import { getCliPrismaClient, disconnectCliPrisma } from './lib/prisma-cli';

const prisma = getCliPrismaClient();
const isDryRun = process.argv.includes('--dry-run');

interface DuplicateGroup {
  clientId: string;
  groupId: string;
  subscriptionTypeId: string;
  validMonth: string;
  subscriptions: Array<{
    id: string;
    createdAt: Date;
    purchaseDate: Date;
    status: string;
    paidPrice: number;
  }>;
}

async function main() {
  console.log('='.repeat(60));
  console.log('ПОИСК И УДАЛЕНИЕ ДУБЛИКАТОВ АБОНЕМЕНТОВ');
  console.log('='.repeat(60));
  console.log(`Режим: ${isDryRun ? 'DRY-RUN (без реальных изменений)' : 'РЕАЛЬНОЕ УДАЛЕНИЕ'}`);
  console.log('');

  // Находим все активные и замороженные абонементы
  console.log('🔍 Поиск абонементов...');
  const allSubscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'FROZEN'] },
    },
    select: {
      id: true,
      clientId: true,
      groupId: true,
      subscriptionTypeId: true,
      validMonth: true,
      purchaseDate: true,
      createdAt: true,
      status: true,
      paidPrice: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          middleName: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
      subscriptionType: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`   Найдено абонементов: ${allSubscriptions.length}`);

  // Группируем абонементы по ключу: clientId + groupId + subscriptionTypeId + validMonth
  const groupsMap = new Map<string, DuplicateGroup>();

  for (const sub of allSubscriptions) {
    const key = `${sub.clientId}|${sub.groupId}|${sub.subscriptionTypeId}|${sub.validMonth}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        clientId: sub.clientId,
        groupId: sub.groupId,
        subscriptionTypeId: sub.subscriptionTypeId,
        validMonth: sub.validMonth,
        subscriptions: [],
      });
    }

    groupsMap.get(key)!.subscriptions.push({
      id: sub.id,
      createdAt: sub.createdAt,
      purchaseDate: sub.purchaseDate,
      status: sub.status,
      paidPrice: Number(sub.paidPrice),
    });
  }

  // Фильтруем только группы с дубликатами (2+ абонемента)
  const duplicateGroups: DuplicateGroup[] = [];
  for (const group of groupsMap.values()) {
    if (group.subscriptions.length > 1) {
      duplicateGroups.push(group);
    }
  }

  console.log(`   Найдено групп дубликатов: ${duplicateGroups.length}`);
  console.log('');

  if (duplicateGroups.length === 0) {
    console.log('✅ Дубликаты не найдены!');
    await disconnectCliPrisma();
    return;
  }

  // Выводим список дубликатов
  console.log('='.repeat(60));
  console.log('ДУБЛИКАТЫ:');
  console.log('='.repeat(60));

  let totalDuplicates = 0;
  const toCancel: string[] = [];

  for (const group of duplicateGroups) {
    // Получаем первый абонемент для получения информации о клиенте
    const firstSub = allSubscriptions.find(s => s.id === group.subscriptions[0].id)!;
    const clientName = `${firstSub.client.lastName} ${firstSub.client.firstName} ${firstSub.client.middleName || ''}`.trim();
    const groupName = firstSub.group.name;
    const subTypeName = firstSub.subscriptionType.name;

    console.log(`\n👤 ${clientName}`);
    console.log(`   Группа: ${groupName}`);
    console.log(`   Тип абонемента: ${subTypeName}`);
    console.log(`   Период: ${group.validMonth}`);
    console.log(`   Количество дубликатов: ${group.subscriptions.length}`);
    console.log('');

    // Сортируем по дате создания (самый старый первый)
    const sorted = group.subscriptions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Оставляем первый (самый старый), остальные удаляем
    const [keep, ...duplicates] = sorted;

    console.log(`   ✅ ОСТАВИТЬ: ID=${keep.id.slice(0, 8)}... (создан: ${keep.createdAt.toLocaleString('ru-RU')}, цена: ${keep.paidPrice} ₽)`);

    for (const dup of duplicates) {
      console.log(`   ❌ УДАЛИТЬ: ID=${dup.id.slice(0, 8)}... (создан: ${dup.createdAt.toLocaleString('ru-RU')}, цена: ${dup.paidPrice} ₽)`);
      toCancel.push(dup.id);
      totalDuplicates++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('ИТОГО:');
  console.log('='.repeat(60));
  console.log(`Всего дубликатов для удаления: ${totalDuplicates}`);
  console.log('');

  if (isDryRun) {
    console.log('💡 Это DRY-RUN режим. Запустите без флага --dry-run для реального удаления.');
  } else {
    console.log('⚠️  НАЧИНАЮ УДАЛЕНИЕ...');
    console.log('');

    let cancelled = 0;
    for (const id of toCancel) {
      try {
        await prisma.subscription.update({
          where: { id },
          data: {
            status: 'CANCELLED',
          },
        });
        cancelled++;
        console.log(`   ✅ Отменен абонемент ${id.slice(0, 8)}... (${cancelled}/${totalDuplicates})`);
      } catch (error) {
        console.error(`   ❌ Ошибка при отмене абонемента ${id}:`, error);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ УДАЛЕНИЕ ЗАВЕРШЕНО');
    console.log('='.repeat(60));
    console.log(`Успешно отменено: ${cancelled} из ${totalDuplicates}`);
  }

  await disconnectCliPrisma();
}

main().catch(async (error) => {
  console.error('❌ Ошибка:', error);
  await disconnectCliPrisma();
  process.exit(1);
});
