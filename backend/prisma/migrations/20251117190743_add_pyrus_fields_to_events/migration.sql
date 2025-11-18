-- AlterTable
ALTER TABLE "events" ADD COLUMN "full_description" TEXT,
ADD COLUMN "timepad_link" TEXT,
ADD COLUMN "is_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_government_task" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "event_format" TEXT;
