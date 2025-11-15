-- CreateTable
CREATE TABLE "lead_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "lead_source_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lead_sources_name_key" ON "lead_sources"("name");

-- CreateIndex
CREATE INDEX "clients_lead_source_id_idx" ON "clients"("lead_source_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_lead_source_id_fkey" FOREIGN KEY ("lead_source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
