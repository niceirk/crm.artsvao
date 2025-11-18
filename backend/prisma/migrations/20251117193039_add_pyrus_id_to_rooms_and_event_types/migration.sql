-- AlterTable
ALTER TABLE "rooms" ADD COLUMN "pyrus_id" TEXT;

-- AlterTable
ALTER TABLE "event_types" ADD COLUMN "pyrus_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pyrus_id_key" ON "rooms"("pyrus_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_pyrus_id_key" ON "event_types"("pyrus_id");
