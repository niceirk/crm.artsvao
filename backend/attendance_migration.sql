-- Add new columns to attendances table
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS subscription_id UUID,
  ADD COLUMN IF NOT EXISTS marked_by UUID,
  ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add foreign key constraints
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_subscription_id ON attendances(subscription_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendances(marked_by);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_attendances_updated_at ON attendances;
CREATE TRIGGER update_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
