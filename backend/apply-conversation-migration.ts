import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting conversation migration...');

  try {
    // Шаг 1: Проверяем дублирующиеся диалоги
    console.log('Checking for duplicate conversations...');
    const duplicates = await prisma.$queryRaw<Array<{ channel_account_id: string; count: bigint }>>`
      SELECT channel_account_id, COUNT(*) as count
      FROM conversations
      GROUP BY channel_account_id
      HAVING COUNT(*) > 1
    `;
    console.log(`Found ${duplicates.length} accounts with duplicate conversations`);

    // Шаг 2: Удаляем дублирующиеся диалоги
    console.log('Removing duplicate conversations...');
    await prisma.$executeRawUnsafe(`
      WITH conversations_to_keep AS (
        SELECT DISTINCT ON (channel_account_id) id
        FROM conversations
        ORDER BY channel_account_id, created_at DESC
      )
      DELETE FROM conversations
      WHERE id NOT IN (SELECT id FROM conversations_to_keep)
    `);
    console.log('Duplicate conversations removed');

    // Шаг 3: Удаляем индекс на client_id
    console.log('Dropping client_id index...');
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "conversations_client_id_idx"`);

    // Шаг 4: Удаляем поле client_id
    console.log('Dropping client_id column...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "client_id"`);

    // Шаг 5: Удаляем старый индекс на channel_account_id
    console.log('Dropping old channel_account_id index...');
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "conversations_channel_account_id_idx"`);

    // Шаг 6: Добавляем UNIQUE constraint
    console.log('Adding unique constraint on channel_account_id...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "conversations"
      ADD CONSTRAINT "conversations_channel_account_id_key"
      UNIQUE ("channel_account_id")
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
