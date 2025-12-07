-- Обновление статусов счетов: упрощение до 3 статусов

-- 1. Добавляем новое значение UNPAID в существующий enum
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'UNPAID';

-- 2. Конвертируем старые статусы в UNPAID
UPDATE invoices
SET status = 'UNPAID'
WHERE status IN ('PENDING', 'CANCELLED', 'DRAFT', 'OVERDUE');

-- 3. Создаём новый enum с нужными значениями
CREATE TYPE "InvoiceStatus_new" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID');

-- 4. Изменяем колонку на новый тип
ALTER TABLE invoices
  ALTER COLUMN status TYPE "InvoiceStatus_new"
  USING status::text::"InvoiceStatus_new";

-- 5. Удаляем старый enum и переименовываем новый
DROP TYPE "InvoiceStatus";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
