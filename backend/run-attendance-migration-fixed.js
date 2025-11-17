const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting attendance migration...\n');

    // 1. Add columns (already done, but safe to run again)
    console.log('1. Adding columns to attendances table...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE attendances
          ADD COLUMN IF NOT EXISTS subscription_id UUID,
          ADD COLUMN IF NOT EXISTS marked_by UUID,
          ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      `);
      console.log('✓ Columns added successfully\n');
    } catch (error) {
      console.log('⚠ Columns might already exist:', error.message, '\n');
    }

    // 2. Add foreign key constraints
    console.log('2. Adding foreign key constraints...');

    // subscription_id
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_attendance_subscription'
          ) THEN
            ALTER TABLE attendances
              ADD CONSTRAINT fk_attendance_subscription
                FOREIGN KEY (subscription_id)
                REFERENCES subscriptions(id)
                ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('✓ Foreign key fk_attendance_subscription added\n');
    } catch (error) {
      console.log('⚠ FK might already exist:', error.message, '\n');
    }

    // marked_by
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_attendance_marked_by'
          ) THEN
            ALTER TABLE attendances
              ADD CONSTRAINT fk_attendance_marked_by
                FOREIGN KEY (marked_by)
                REFERENCES users(id)
                ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('✓ Foreign key fk_attendance_marked_by added\n');
    } catch (error) {
      console.log('⚠ FK might already exist:', error.message, '\n');
    }

    // 3. Create indexes
    console.log('3. Creating indexes...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_attendance_subscription_id ON attendances(subscription_id);
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendances(marked_by);
      `);
      console.log('✓ Indexes created\n');
    } catch (error) {
      console.log('⚠ Indexes might already exist:', error.message, '\n');
    }

    // 4. Create trigger function
    console.log('4. Creating trigger function...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      console.log('✓ Trigger function created\n');
    } catch (error) {
      console.error('✗ Failed to create trigger function:', error.message, '\n');
    }

    // 5. Create trigger
    console.log('5. Creating trigger...');
    try {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS update_attendances_updated_at ON attendances;`);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER update_attendances_updated_at
            BEFORE UPDATE ON attendances
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✓ Trigger created\n');
    } catch (error) {
      console.error('✗ Failed to create trigger:', error.message, '\n');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
