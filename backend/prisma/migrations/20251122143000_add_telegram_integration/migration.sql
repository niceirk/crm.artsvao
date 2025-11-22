-- CreateEnum
CREATE TYPE "TelegramState" AS ENUM ('NEW_USER', 'WAITING_FOR_PHONE', 'IDENTIFIED', 'GUEST', 'BOUND_MANUALLY');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('TELEGRAM', 'WEB', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CLIENT', 'MANAGER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageCategory" AS ENUM ('PAYMENT', 'SCHEDULE', 'REMINDER', 'SUBSCRIPTION', 'CHAT');

-- CreateTable
CREATE TABLE "telegram_accounts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "telegram_user_id" BIGINT NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "username" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "is_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "state" "TelegramState" NOT NULL DEFAULT 'NEW_USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "channel_account_id" TEXT NOT NULL,
    "source" "MessageSource" NOT NULL DEFAULT 'TELEGRAM',
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "sender_type" "MessageSenderType" NOT NULL,
    "text" TEXT,
    "payload" JSONB,
    "category" "MessageCategory",
    "is_read_by_client" BOOLEAN NOT NULL DEFAULT false,
    "is_read_by_manager" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "template_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_accounts_telegram_user_id_key" ON "telegram_accounts"("telegram_user_id");

-- CreateIndex
CREATE INDEX "telegram_accounts_client_id_idx" ON "telegram_accounts"("client_id");

-- CreateIndex
CREATE INDEX "telegram_accounts_telegram_user_id_idx" ON "telegram_accounts"("telegram_user_id");

-- CreateIndex
CREATE INDEX "telegram_accounts_state_idx" ON "telegram_accounts"("state");

-- CreateIndex
CREATE INDEX "conversations_client_id_idx" ON "conversations"("client_id");

-- CreateIndex
CREATE INDEX "conversations_channel_account_id_idx" ON "conversations"("channel_account_id");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- CreateIndex
CREATE INDEX "messages_sender_type_idx" ON "messages"("sender_type");

-- CreateIndex
CREATE INDEX "messages_category_idx" ON "messages"("category");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_event_type_key" ON "notification_templates"("event_type");

-- CreateIndex
CREATE INDEX "notification_templates_is_active_idx" ON "notification_templates"("is_active");

-- AddForeignKey
ALTER TABLE "telegram_accounts" ADD CONSTRAINT "telegram_accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_account_id_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "telegram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
