-- Шаг 1: Добавляем UNPAID в существующий enum
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'UNPAID';
