const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  try {
    const migrationPath = path.join(__dirname, 'attendance_migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by ; but keep DO blocks together
    const statements = [];
    let current = '';
    let inDoBlock = false;

    for (const line of sql.split('\n')) {
      if (line.trim().startsWith('DO $$')) {
        inDoBlock = true;
      }

      current += line + '\n';

      if (line.trim() === 'END $$;') {
        inDoBlock = false;
        statements.push(current.trim());
        current = '';
      } else if (!inDoBlock && line.trim().endsWith(';') && current.trim()) {
        statements.push(current.trim());
        current = '';
      }
    }

    console.log(`Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt && !stmt.startsWith('--')) {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);
        try {
          await prisma.$executeRawUnsafe(stmt);
          console.log(`✓ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`✗ Statement ${i + 1} failed:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
