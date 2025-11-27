-- Добавляем расширение pg_trgm для быстрого поиска подстрок
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Создаём GIN-индексы для быстрого поиска по полям клиентов
-- gin_trgm_ops позволяет использовать ILIKE с индексами

CREATE INDEX IF NOT EXISTS idx_clients_first_name_trgm
ON clients USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_last_name_trgm
ON clients USING gin (last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_middle_name_trgm
ON clients USING gin (middle_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_phone_trgm
ON clients USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_email_trgm
ON clients USING gin (email gin_trgm_ops);
