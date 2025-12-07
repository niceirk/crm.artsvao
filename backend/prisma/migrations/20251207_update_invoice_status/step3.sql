-- Шаг 3: Пересоздаём enum с нужными значениями

-- Убираем default
ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT;

-- Создаём новый enum
CREATE TYPE "InvoiceStatus_new" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID');

-- Меняем тип колонки
ALTER TABLE invoices
  ALTER COLUMN status TYPE "InvoiceStatus_new"
  USING status::text::"InvoiceStatus_new";

-- Удаляем старый enum
DROP TYPE "InvoiceStatus";

-- Переименовываем новый
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";

-- Восстанавливаем default
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'UNPAID'::"InvoiceStatus";
