const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Connected to database via Prisma');

    const migrationPath = path.join(
      __dirname,
      'prisma/migrations/20251117192308_add_description_color_to_event_types/migration.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Executing migration SQL...');
    console.log(sql);

    await prisma.$executeRawUnsafe(sql);
    console.log('Migration applied successfully!');

    // Mark migration as applied in _prisma_migrations table
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES (
        gen_random_uuid(),
        'manual_migration',
        NOW(),
        '20251117192308_add_description_color_to_event_types',
        NULL,
        NULL,
        NOW(),
        1
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('Migration recorded in _prisma_migrations table');

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
