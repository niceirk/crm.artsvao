-- Шаг 2: Конвертируем статусы в UNPAID
UPDATE invoices
SET status = 'UNPAID'
WHERE status IN ('PENDING', 'CANCELLED', 'DRAFT', 'OVERDUE');
