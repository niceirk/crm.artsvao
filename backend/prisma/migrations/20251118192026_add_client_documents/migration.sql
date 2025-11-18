-- AddClientDocuments
-- Add document fields to clients table

ALTER TABLE "clients" ADD COLUMN "passport_number" VARCHAR(20);
ALTER TABLE "clients" ADD COLUMN "birth_certificate" VARCHAR(50);
ALTER TABLE "clients" ADD COLUMN "snils" VARCHAR(14);
ALTER TABLE "clients" ADD COLUMN "phone_additional" VARCHAR(20);

-- Create index for SNILS field for faster lookups
CREATE INDEX "clients_snils_idx" ON "clients"("snils");
