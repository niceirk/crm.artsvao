-- AlterTable
ALTER TABLE "rooms" ADD COLUMN "last_synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_types" ADD COLUMN "last_synced_at" TIMESTAMP(3);
