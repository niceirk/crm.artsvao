/**
 * Скрипт миграции HOURLY заявок
 * Объединяет отдельные часовые заявки одного клиента в одну заявку с несколькими слотами
 *
 * Использование:
 *   npx ts-node scripts/migrate-hourly-applications.ts --dry-run  # Только показать что будет сделано
 *   npx ts-node scripts/migrate-hourly-applications.ts            # Выполнить миграцию
 */

import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { getCliPrismaClient, disconnectCliPrisma } from './lib/prisma-cli';

// Используем shared client с маленьким пулом соединений
const prisma = getCliPrismaClient();

// Проверка флага dry-run
const isDryRun = process.argv.includes('--dry-run');

// Пути для бэкапов
const BACKUPS_DIR = path.join(__dirname, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_FILE = path.join(BACKUPS_DIR, `migration_backup_${timestamp}.json`);
const LOG_FILE = path.join(BACKUPS_DIR, `migration_log_${timestamp}.json`);

interface MigrationGroup {
  clientId: string;
  clientName: string;
  roomId: string;
  roomName: string;
  date: string;
  applications: {
    id: string;
    applicationNumber: string;
    startTime: Date | null;
    endTime: Date | null;
    totalPrice: Prisma.Decimal;
    rentals: { id: string }[];
  }[];
}

interface MigrationLogEntry {
  mainApplicationId: string;
  mainAppNumber: string;
  mergedApplicationIds: string[];
  movedRentalIds: string[];
  deletedAppNumbers: string[];
  newQuantity: number;
  newTotalPrice: number;
}

interface MigrationLog {
  timestamp: string;
  isDryRun: boolean;
  groups: MigrationLogEntry[];
  backup: {
    applicationsFile: string;
    rentalsFile: string;
  };
}

async function createBackup() {
  console.log('\n📦 Создание бэкапа данных...');

  const BATCH_SIZE = 500;

  // Получаем все HOURLY заявки порциями
  let allApplications: any[] = [];
  let skip = 0;
  while (true) {
    const batch = await prisma.rentalApplication.findMany({
      where: { rentalType: 'HOURLY' },
      include: { rentals: true },
      take: BATCH_SIZE,
      skip,
    });
    if (batch.length === 0) break;
    allApplications.push(...batch);
    skip += BATCH_SIZE;
    console.log(`   Загружено ${allApplications.length} заявок для бэкапа...`);
    if (batch.length < BATCH_SIZE) break;
  }
  const applications = allApplications;

  // Получаем все Rental записи порциями
  const appIds = applications.map((a) => a.id);
  let allRentals: any[] = [];
  skip = 0;
  while (true) {
    const batch = await prisma.rental.findMany({
      where: {
        rentalApplicationId: { in: appIds },
      },
      take: BATCH_SIZE,
      skip,
    });
    if (batch.length === 0) break;
    allRentals.push(...batch);
    skip += BATCH_SIZE;
    if (batch.length < BATCH_SIZE) break;
  }
  const rentals = allRentals;

  const backup = {
    timestamp: new Date().toISOString(),
    applications,
    rentals,
  };

  if (!isDryRun) {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Бэкап сохранён: ${BACKUP_FILE}`);
  } else {
    console.log(`   ⏸️  [DRY-RUN] Бэкап будет сохранён в: ${BACKUP_FILE}`);
  }

  return backup;
}

async function findGroups(): Promise<MigrationGroup[]> {
  console.log('\n🔍 Поиск групп для объединения...');

  const BATCH_SIZE = 500;

  // Получаем все HOURLY DRAFT заявки порциями
  let allApplications: any[] = [];
  let skip = 0;
  while (true) {
    const batch = await prisma.rentalApplication.findMany({
      where: {
        rentalType: 'HOURLY',
        status: 'DRAFT',
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        room: { select: { name: true } },
        rentals: { select: { id: true } },
      },
      orderBy: [{ clientId: 'asc' }, { roomId: 'asc' }, { startDate: 'asc' }, { startTime: 'asc' }],
      take: BATCH_SIZE,
      skip,
    });
    if (batch.length === 0) break;
    allApplications.push(...batch);
    skip += BATCH_SIZE;
    console.log(`   Загружено ${allApplications.length} заявок...`);
    if (batch.length < BATCH_SIZE) break;
  }
  const applications = allApplications;

  // Группируем по clientId + roomId + date
  const groupsMap = new Map<string, MigrationGroup>();

  for (const app of applications) {
    const dateStr = app.startDate.toISOString().slice(0, 10);
    const key = `${app.clientId}-${app.roomId}-${dateStr}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        clientId: app.clientId,
        clientName: `${app.client.firstName} ${app.client.lastName}`,
        roomId: app.roomId!,
        roomName: app.room?.name || 'Unknown',
        date: dateStr,
        applications: [],
      });
    }

    groupsMap.get(key)!.applications.push({
      id: app.id,
      applicationNumber: app.applicationNumber,
      startTime: app.startTime,
      endTime: app.endTime,
      totalPrice: app.totalPrice,
      rentals: app.rentals,
    });
  }

  // Фильтруем только группы с > 1 заявкой
  const groups = Array.from(groupsMap.values()).filter((g) => g.applications.length > 1);

  console.log(`   Найдено ${groups.length} групп для объединения:`);
  for (const group of groups) {
    console.log(
      `   - ${group.clientName} | ${group.roomName} | ${group.date} | ${group.applications.length} заявок`,
    );
  }

  return groups;
}

async function migrateGroups(groups: MigrationGroup[]): Promise<MigrationLogEntry[]> {
  console.log('\n🔄 Миграция групп...');
  const logEntries: MigrationLogEntry[] = [];

  for (const group of groups) {
    console.log(`\n   Группа: ${group.clientName} | ${group.roomName} | ${group.date}`);

    // Сортируем заявки по номеру (чтобы выбрать первую как главную)
    const sortedApps = group.applications.sort((a, b) =>
      a.applicationNumber.localeCompare(b.applicationNumber),
    );

    const mainApp = sortedApps[0];
    const appsToMerge = sortedApps.slice(1);

    console.log(`     Главная заявка: ${mainApp.applicationNumber}`);
    console.log(
      `     Объединяемые: ${appsToMerge.map((a) => a.applicationNumber).join(', ')}`,
    );

    // Собираем все rental IDs для переноса
    const allRentalIds: string[] = [];
    for (const app of appsToMerge) {
      for (const rental of app.rentals) {
        allRentalIds.push(rental.id);
      }
    }

    // Рассчитываем новые значения
    const newQuantity = sortedApps.length;
    const basePrice = Number(mainApp.totalPrice);
    const newTotalPrice = basePrice * newQuantity;

    // Определяем время начала и конца (мин/макс)
    const allTimes = sortedApps
      .filter((a) => a.startTime && a.endTime)
      .flatMap((a) => [a.startTime!, a.endTime!]);
    const minTime = allTimes.length > 0 ? new Date(Math.min(...allTimes.map((t) => t.getTime()))) : null;
    const maxTime = allTimes.length > 0 ? new Date(Math.max(...allTimes.map((t) => t.getTime()))) : null;

    console.log(`     Новое quantity: ${newQuantity}`);
    console.log(`     Новая цена: ${newTotalPrice}`);
    console.log(`     Rental для переноса: ${allRentalIds.length}`);

    if (!isDryRun) {
      await prisma.$transaction(async (tx) => {
        // 1. Перенести rentals на главную заявку
        if (allRentalIds.length > 0) {
          await tx.rental.updateMany({
            where: { id: { in: allRentalIds } },
            data: { rentalApplicationId: mainApp.id },
          });
        }

        // 2. Обновить главную заявку
        await tx.rentalApplication.update({
          where: { id: mainApp.id },
          data: {
            quantity: newQuantity,
            totalPrice: newTotalPrice,
            startTime: minTime,
            endTime: maxTime,
          },
        });

        // 3. Удалить объединённые заявки
        await tx.rentalApplication.deleteMany({
          where: { id: { in: appsToMerge.map((a) => a.id) } },
        });
      });

      console.log(`     ✅ Объединено`);
    } else {
      console.log(`     ⏸️  [DRY-RUN] Будет объединено`);
    }

    logEntries.push({
      mainApplicationId: mainApp.id,
      mainAppNumber: mainApp.applicationNumber,
      mergedApplicationIds: appsToMerge.map((a) => a.id),
      movedRentalIds: allRentalIds,
      deletedAppNumbers: appsToMerge.map((a) => a.applicationNumber),
      newQuantity,
      newTotalPrice,
    });
  }

  return logEntries;
}

async function saveMigrationLog(logEntries: MigrationLogEntry[]) {
  const log: MigrationLog = {
    timestamp: new Date().toISOString(),
    isDryRun,
    groups: logEntries,
    backup: {
      applicationsFile: BACKUP_FILE,
      rentalsFile: BACKUP_FILE,
    },
  };

  if (!isDryRun) {
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    console.log(`\n📝 Лог миграции сохранён: ${LOG_FILE}`);
  } else {
    console.log(`\n📝 [DRY-RUN] Лог будет сохранён в: ${LOG_FILE}`);
  }

  return log;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('   МИГРАЦИЯ HOURLY ЗАЯВОК');
  console.log('   Объединение отдельных часовых заявок в многослотовые');
  console.log('═'.repeat(60));

  if (isDryRun) {
    console.log('\n⚠️  РЕЖИМ DRY-RUN - изменения НЕ будут применены\n');
  } else {
    console.log('\n🚀 РЕЖИМ ВЫПОЛНЕНИЯ - изменения БУДУТ применены\n');
  }

  try {
    // 1. Создать бэкап
    await createBackup();

    // 2. Найти группы
    const groups = await findGroups();

    if (groups.length === 0) {
      console.log('\n✅ Нет групп для объединения. Миграция не требуется.');
      return;
    }

    // 3. Подсчёт статистики
    const totalApps = groups.reduce((sum, g) => sum + g.applications.length, 0);
    const appsAfter = groups.length + (totalApps - groups.reduce((sum, g) => sum + g.applications.length, 0));

    console.log('\n📊 Статистика:');
    console.log(`   Заявок до миграции: ${totalApps}`);
    console.log(`   Заявок после миграции: ${groups.length}`);
    console.log(`   Будет удалено: ${totalApps - groups.length}`);

    // 4. Выполнить миграцию
    const logEntries = await migrateGroups(groups);

    // 5. Сохранить лог
    await saveMigrationLog(logEntries);

    console.log('\n' + '═'.repeat(60));
    if (isDryRun) {
      console.log('   ✅ DRY-RUN завершён. Для выполнения запустите без --dry-run');
    } else {
      console.log('   ✅ Миграция успешно завершена!');
      console.log(`   Для отката используйте: npx ts-node scripts/rollback-hourly-migration.ts ${LOG_FILE}`);
    }
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error);
    throw error;
  } finally {
    await disconnectCliPrisma();
  }
}

main();
