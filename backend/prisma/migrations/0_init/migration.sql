-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'VIP');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('HALL', 'CLASS', 'STUDIO', 'CONFERENCE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'VACATION', 'DISMISSED');

-- CreateEnum
CREATE TYPE "StudioType" AS ENUM ('GROUP', 'INDIVIDUAL', 'BOTH');

-- CreateEnum
CREATE TYPE "StudioStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('GROUP', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "SubscriptionTypeEnum" AS ENUM ('UNLIMITED', 'SINGLE_VISIT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'FROZEN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'ONLINE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'RENTAL', 'SINGLE_VISIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('REQUEST', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'BLOCKED',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender",
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "photo_url" TEXT,
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_relations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "related_client_id" TEXT NOT NULL,
    "relation_type" "RelationType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "area" DECIMAL(10,2),
    "capacity" INTEGER,
    "type" "RoomType" NOT NULL,
    "equipment" TEXT,
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "daily_rate" DECIMAL(10,2),
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "specialization" TEXT,
    "salary_percentage" DECIMAL(5,2) NOT NULL,
    "photo_url" TEXT,
    "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "StudioType" NOT NULL,
    "category" TEXT,
    "age_min" INTEGER,
    "age_max" INTEGER,
    "photo_url" TEXT,
    "status" "StudioStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "room_id" TEXT,
    "max_participants" INTEGER NOT NULL,
    "single_session_price" DECIMAL(10,2) NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "subscription_deducted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group_id" TEXT NOT NULL,
    "type" "SubscriptionTypeEnum" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "subscription_type_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "valid_month" TEXT NOT NULL,
    "purchase_date" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "original_price" DECIMAL(10,2) NOT NULL,
    "paid_price" DECIMAL(10,2) NOT NULL,
    "remaining_visits" INTEGER,
    "purchased_months" INTEGER NOT NULL DEFAULT 1,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "subscription_id" TEXT,
    "rental_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "client_email" TEXT,
    "event_type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'REQUEST',
    "manager_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "room_ids" TEXT[],
    "max_capacity" INTEGER,
    "responsible_user_id" TEXT,
    "photo_url" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "organization_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "logo" TEXT,
    "working_hours" JSONB NOT NULL,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_user" TEXT,
    "smtp_password" TEXT,
    "email_from" TEXT,
    "email_notifications" JSONB,
    "default_currency" TEXT NOT NULL DEFAULT 'RUB',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "default_subscription_validity" INTEGER NOT NULL DEFAULT 30,
    "instructor_percentage" DECIMAL(5,2) NOT NULL DEFAULT 40.0,
    "allow_expired_subscriptions" BOOLEAN NOT NULL DEFAULT false,
    "allow_deduct_after_expiry" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_user_id_idx" ON "user_invitations"("user_id");

-- CreateIndex
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_last_name_idx" ON "clients"("last_name");

-- CreateIndex
CREATE INDEX "schedules_date_idx" ON "schedules"("date");

-- CreateIndex
CREATE INDEX "schedules_teacher_id_idx" ON "schedules"("teacher_id");

-- CreateIndex
CREATE INDEX "schedules_room_id_idx" ON "schedules"("room_id");

-- CreateIndex
CREATE INDEX "schedules_group_id_idx" ON "schedules"("group_id");

-- CreateIndex
CREATE INDEX "schedules_date_room_id_idx" ON "schedules"("date", "room_id");

-- CreateIndex
CREATE INDEX "attendances_client_id_idx" ON "attendances"("client_id");

-- CreateIndex
CREATE INDEX "attendances_schedule_id_idx" ON "attendances"("schedule_id");

-- CreateIndex
CREATE INDEX "attendances_created_at_idx" ON "attendances"("created_at");

-- CreateIndex
CREATE INDEX "subscription_types_group_id_idx" ON "subscription_types"("group_id");

-- CreateIndex
CREATE INDEX "subscriptions_client_id_idx" ON "subscriptions"("client_id");

-- CreateIndex
CREATE INDEX "subscriptions_group_id_idx" ON "subscriptions"("group_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_valid_month_idx" ON "subscriptions"("valid_month");

-- CreateIndex
CREATE INDEX "subscriptions_start_date_end_date_idx" ON "subscriptions"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "payments_client_id_idx" ON "payments"("client_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE INDEX "payments_payment_type_idx" ON "payments"("payment_type");

-- CreateIndex
CREATE INDEX "rentals_date_idx" ON "rentals"("date");

-- CreateIndex
CREATE INDEX "rentals_room_id_idx" ON "rentals"("room_id");

-- CreateIndex
CREATE INDEX "rentals_manager_id_idx" ON "rentals"("manager_id");

-- CreateIndex
CREATE INDEX "rentals_status_idx" ON "rentals"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_related_client_id_fkey" FOREIGN KEY ("related_client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_types" ADD CONSTRAINT "subscription_types_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_subscription_type_id_fkey" FOREIGN KEY ("subscription_type_id") REFERENCES "subscription_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

