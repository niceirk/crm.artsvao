-- AlterEnum: Rename old enum values to new ones
ALTER TYPE "ScheduleType" RENAME TO "ScheduleType_old";

-- CreateEnum: Create new enum with updated values
CREATE TYPE "ScheduleType" AS ENUM ('GROUP_CLASS', 'INDIVIDUAL_CLASS', 'OPEN_CLASS', 'EVENT');

-- AlterTable: Update existing data
ALTER TABLE "schedules"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE TEXT;

UPDATE "schedules"
  SET "type" = CASE
    WHEN "type" = 'GROUP' THEN 'GROUP_CLASS'
    WHEN "type" = 'INDIVIDUAL' THEN 'INDIVIDUAL_CLASS'
    ELSE "type"
  END;

ALTER TABLE "schedules"
  ALTER COLUMN "type" TYPE "ScheduleType" USING "type"::"ScheduleType",
  ALTER COLUMN "type" SET DEFAULT 'GROUP_CLASS'::"ScheduleType";

-- DropEnum: Remove old enum
DROP TYPE "ScheduleType_old";
