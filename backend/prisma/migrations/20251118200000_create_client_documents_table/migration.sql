-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'BIRTH_CERTIFICATE', 'DRIVERS_LICENSE', 'SNILS', 'FOREIGN_PASSPORT', 'INN', 'MEDICAL_CERTIFICATE', 'MSE_CERTIFICATE', 'OTHER');

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "series" TEXT,
    "number" TEXT,
    "issued_by" TEXT,
    "issued_at" DATE,
    "expires_at" DATE,
    "department_code" VARCHAR(10),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "citizenship" VARCHAR(50),
    "full_display" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_documents_client_id_idx" ON "client_documents"("client_id");

-- CreateIndex
CREATE INDEX "client_documents_document_type_idx" ON "client_documents"("document_type");

-- CreateIndex
CREATE INDEX "client_documents_is_primary_idx" ON "client_documents"("is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "client_documents_client_id_document_type_key" ON "client_documents"("client_id", "document_type");

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
