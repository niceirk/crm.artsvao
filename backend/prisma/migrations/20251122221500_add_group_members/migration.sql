-- CreateEnum
CREATE TYPE "GroupMemberStatus" AS ENUM ('ACTIVE', 'WAITLIST', 'EXPELLED');

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "status" "GroupMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "waitlist_position" INTEGER,
    "promoted_from_waitlist_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_client_id_key" ON "group_members"("group_id", "client_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_client_id_idx" ON "group_members"("client_id");

-- CreateIndex
CREATE INDEX "group_members_status_idx" ON "group_members"("status");

-- CreateIndex
CREATE INDEX "group_members_waitlist_position_idx" ON "group_members"("waitlist_position");

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from subscriptions to group_members
-- Create GroupMember records for all clients who have or had subscriptions
-- Все клиенты с абонементами (даже истекшими) становятся ACTIVE участниками группы
INSERT INTO group_members (id, group_id, client_id, status, joined_at, created_at, updated_at)
SELECT
    gen_random_uuid(),
    group_id,
    client_id,
    'ACTIVE'::"GroupMemberStatus",  -- Все становятся активными участниками
    MIN(created_at) as joined_at,  -- Дата первой покупки абонемента = дата вступления
    MIN(created_at) as created_at,
    NOW() as updated_at
FROM subscriptions
GROUP BY group_id, client_id
ON CONFLICT (group_id, client_id) DO NOTHING;
