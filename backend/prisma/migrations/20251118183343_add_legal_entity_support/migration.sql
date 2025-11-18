-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'LEGAL_ENTITY');

-- AlterTable
ALTER TABLE "clients"
  ADD COLUMN "client_type" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "company_name" TEXT,
  ADD COLUMN "inn" TEXT;

-- CreateIndex
CREATE INDEX "clients_client_type_idx" ON "clients"("client_type");

-- CreateIndex
CREATE INDEX "clients_inn_idx" ON "clients"("inn");
