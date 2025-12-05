/**
 * Скрипт отката миграции HOURLY заявок
 * Восстанавливает исходное состояние из бэкапа
 *
 * Использование:
 *   npx ts-node scripts/rollback-hourly-migration.ts <путь_к_бэкапу>
 *
 * Пример:
 *   npx ts-node scripts/rollback-hourly-migration.ts scripts/backups/migration_backup_2025-12-04.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  applications: any[];
  rentals: any[];
}

async function main() {
  console.log('═'.repeat(60));
  console.log('   ОТКАТ МИГРАЦИИ HOURLY ЗАЯВОК');
  console.log('═'.repeat(60));

  // Получаем путь к файлу бэкапа из аргументов
  const backupPath = process.argv[2];

  if (!backupPath) {
    console.error('\n❌ Ошибка: не указан путь к файлу бэкапа');
    console.log('\nИспользование:');
    console.log('  npx ts-node scripts/rollback-hourly-migration.ts <путь_к_бэкапу>');
    console.log('\nПример:');
    console.log(
      '  npx ts-node scripts/rollback-hourly-migration.ts scripts/backups/migration_backup_2025-12-04.json',
    );

    // Показать доступные бэкапы
    const backupsDir = path.join(__dirname, 'backups');
    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir).filter((f) => f.startsWith('migration_backup_'));
      if (files.length > 0) {
        console.log('\nДоступные бэкапы:');
        files.forEach((f) => console.log(`  - scripts/backups/${f}`));
      }
    }
    process.exit(1);
  }

  // Проверяем существование файла
  const fullPath = path.isAbsolute(backupPath) ? backupPath : path.join(process.cwd(), backupPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ Файл бэкапа не найден: ${fullPath}`);
    process.exit(1);
  }

  console.log(`\n📂 Загрузка бэкапа: ${fullPath}`);

  try {
    const backupContent = fs.readFileSync(fullPath, 'utf-8');
    const backup: BackupData = JSON.parse(backupContent);

    console.log(`   Дата бэкапа: ${backup.timestamp}`);
    console.log(`   Заявок в бэкапе: ${backup.applications.length}`);
    console.log(`   Rentals в бэкапе: ${backup.rentals.length}`);

    // Подтверждение
    console.log('\n⚠️  ВНИМАНИЕ: Это действие удалит текущие HOURLY заявки и восстановит из бэкапа!');
    console.log('   Для продолжения добавьте флаг --confirm');

    if (!process.argv.includes('--confirm')) {
      console.log('\n   Отмена операции.');
      process.exit(0);
    }

    console.log('\n🔄 Начинаю откат...');

    await prisma.$transaction(async (tx) => {
      // 1. Удаляем текущие HOURLY заявки
      console.log('   1. Удаление текущих HOURLY заявок...');
      await tx.rental.deleteMany({
        where: {
          rentalApplication: { rentalType: 'HOURLY' },
        },
      });
      await tx.rentalApplication.deleteMany({
        where: { rentalType: 'HOURLY' },
      });

      // 2. Восстанавливаем заявки из бэкапа
      console.log('   2. Восстановление заявок из бэкапа...');
      for (const app of backup.applications) {
        // Удаляем связанные поля которые могут вызвать конфликты
        const { rentals, client, room, manager, workspaces, selectedDays, invoices, _count, ...appData } =
          app;

        await tx.rentalApplication.create({
          data: {
            ...appData,
            // Конвертируем Decimal поля
            basePrice: parseFloat(appData.basePrice),
            adjustedPrice: appData.adjustedPrice ? parseFloat(appData.adjustedPrice) : null,
            totalPrice: parseFloat(appData.totalPrice),
          },
        });
      }

      // 3. Восстанавливаем rentals
      console.log('   3. Восстановление rentals...');
      for (const rental of backup.rentals) {
        const { room, client, manager, rentalApplication, ...rentalData } = rental;

        await tx.rental.create({
          data: {
            ...rentalData,
            totalPrice: parseFloat(rentalData.totalPrice),
          },
        });
      }
    });

    console.log('\n' + '═'.repeat(60));
    console.log('   ✅ Откат успешно завершён!');
    console.log(`   Восстановлено заявок: ${backup.applications.length}`);
    console.log(`   Восстановлено rentals: ${backup.rentals.length}`);
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('\n❌ Ошибка отката:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
