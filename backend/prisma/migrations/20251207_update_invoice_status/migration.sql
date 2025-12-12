-- Обновление статусов счетов: упрощение до 3 статусов

-- 0. Удаляем временный тип если он остался от предыдущих попыток
DROP TYPE IF EXISTS "InvoiceStatus_new";

-- 1. Добавляем новое значение UNPAID в существующий enum
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'UNPAID';

-- 2. Конвертируем старые статусы в UNPAID (через TEXT для безопасности)
UPDATE invoices
SET status = 'UNPAID'
WHERE status::text IN ('PENDING', 'CANCELLED', 'DRAFT', 'OVERDUE');

-- 3. Удаляем DEFAULT перед изменением типа
ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT;

-- 4. Создаём новый enum с нужными значениями
CREATE TYPE "InvoiceStatus_new" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID');

-- 5. Изменяем колонку на новый тип
ALTER TABLE invoices
  ALTER COLUMN status TYPE "InvoiceStatus_new"
  USING status::text::"InvoiceStatus_new";

-- 6. Удаляем старый enum и переименовываем новый
DROP TYPE "InvoiceStatus";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";

-- 7. Устанавливаем новый DEFAULT
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'UNPAID'::"InvoiceStatus";
