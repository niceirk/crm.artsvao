-- AlterTable
ALTER TABLE "clients" ADD COLUMN "last_activity_at" TIMESTAMP(3);

-- Устанавливаем начальное значение lastActivityAt равным createdAt для существующих клиентов
UPDATE "clients" SET "last_activity_at" = "created_at" WHERE "last_activity_at" IS NULL;

-- Создаем индекс для эффективного поиска неактивных клиентов
CREATE INDEX "clients_last_activity_at_idx" ON "clients"("last_activity_at");

-- Создаем составной индекс для быстрого поиска активных клиентов с устаревшей активностью
CREATE INDEX "clients_status_last_activity_at_idx" ON "clients"("status", "last_activity_at");
