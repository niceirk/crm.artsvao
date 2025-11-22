-- Шаг 1: Удаляем дублирующиеся диалоги, оставляя только самый новый для каждого channel_account_id
-- Сначала создаем временную таблицу с ID диалогов, которые нужно оставить
WITH conversations_to_keep AS (
  SELECT DISTINCT ON (channel_account_id) id
  FROM conversations
  ORDER BY channel_account_id, created_at DESC
)
DELETE FROM conversations
WHERE id NOT IN (SELECT id FROM conversations_to_keep);

-- Шаг 2: Удаляем индекс на client_id
DROP INDEX IF EXISTS "conversations_client_id_idx";

-- Шаг 3: Удаляем поле client_id
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "client_id";

-- Шаг 4: Удаляем старый индекс на channel_account_id
DROP INDEX IF EXISTS "conversations_channel_account_id_idx";

-- Шаг 5: Добавляем UNIQUE constraint на channel_account_id (только если не существует)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_channel_account_id_key'
  ) THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_account_id_key" UNIQUE ("channel_account_id");
  END IF;
END $$;
