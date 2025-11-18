-- AlterTable
ALTER TABLE "events" ADD COLUMN "external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "events_external_id_key" ON "events"("external_id");
