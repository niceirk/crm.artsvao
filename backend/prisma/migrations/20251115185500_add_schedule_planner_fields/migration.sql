-- AlterTable
ALTER TABLE "schedules" ADD COLUMN "parent_schedule_id" TEXT,
ADD COLUMN "recurrence_end_date" DATE,
ADD COLUMN "cancellation_reason" TEXT,
ADD COLUMN "created_by" TEXT;

-- CreateIndex
CREATE INDEX "schedules_parent_schedule_id_idx" ON "schedules"("parent_schedule_id");

-- CreateIndex
CREATE INDEX "schedules_group_id_date_idx" ON "schedules"("group_id", "date");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_parent_schedule_id_fkey" FOREIGN KEY ("parent_schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
