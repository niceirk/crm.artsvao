const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Применение миграции для поля externalId...');

    // Добавляем колонку external_id если её нет
    await prisma.$executeRawUnsafe(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id TEXT;
    `);

    console.log('Колонка external_id добавлена');

    // Создаем уникальный индекс если его нет
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'events_external_id_key'
        ) THEN
          CREATE UNIQUE INDEX events_external_id_key ON events(external_id);
        END IF;
      END $$;
    `);

    console.log('Уникальный индекс создан');
    console.log('✅ Миграция успешно применена!');
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
