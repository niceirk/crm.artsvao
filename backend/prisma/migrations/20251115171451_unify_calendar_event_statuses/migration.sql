-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- AlterTable schedules: Migrate from ScheduleStatus to CalendarEventStatus
-- Map: SCHEDULED -> PLANNED, COMPLETED -> COMPLETED, CANCELLED -> CANCELLED
ALTER TABLE "schedules"
  ADD COLUMN "status_new" "CalendarEventStatus" NOT NULL DEFAULT 'PLANNED';

UPDATE "schedules" SET "status_new" =
  CASE
    WHEN "status"::text = 'SCHEDULED' THEN 'PLANNED'::"CalendarEventStatus"
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::"CalendarEventStatus"
    WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'::"CalendarEventStatus"
    ELSE 'PLANNED'::"CalendarEventStatus"
  END;

ALTER TABLE "schedules" DROP COLUMN "status";
ALTER TABLE "schedules" RENAME COLUMN "status_new" TO "status";

-- AlterTable rentals: Migrate from RentalStatus to CalendarEventStatus
-- Map: REQUEST/CONFIRMED/PAID -> PLANNED, COMPLETED -> COMPLETED, CANCELLED -> CANCELLED
ALTER TABLE "rentals"
  ADD COLUMN "status_new" "CalendarEventStatus" NOT NULL DEFAULT 'PLANNED';

UPDATE "rentals" SET "status_new" =
  CASE
    WHEN "status"::text IN ('REQUEST', 'CONFIRMED', 'PAID') THEN 'PLANNED'::"CalendarEventStatus"
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::"CalendarEventStatus"
    WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'::"CalendarEventStatus"
    ELSE 'PLANNED'::"CalendarEventStatus"
  END;

ALTER TABLE "rentals" DROP COLUMN "status";
ALTER TABLE "rentals" RENAME COLUMN "status_new" TO "status";

-- AlterTable events: EventStatus already matches CalendarEventStatus, just rename type
ALTER TABLE "events"
  ADD COLUMN "status_new" "CalendarEventStatus" NOT NULL DEFAULT 'PLANNED';

UPDATE "events" SET "status_new" =
  CASE
    WHEN "status"::text = 'PLANNED' THEN 'PLANNED'::"CalendarEventStatus"
    WHEN "status"::text = 'ONGOING' THEN 'ONGOING'::"CalendarEventStatus"
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::"CalendarEventStatus"
    WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'::"CalendarEventStatus"
    ELSE 'PLANNED'::"CalendarEventStatus"
  END;

ALTER TABLE "events" DROP COLUMN "status";
ALTER TABLE "events" RENAME COLUMN "status_new" TO "status";

-- AlterTable reservations: Migrate from ReservationStatus to CalendarEventStatus
-- Map: ACTIVE -> PLANNED, CANCELLED -> CANCELLED
ALTER TABLE "reservations"
  ADD COLUMN "status_new" "CalendarEventStatus" NOT NULL DEFAULT 'PLANNED';

UPDATE "reservations" SET "status_new" =
  CASE
    WHEN "status"::text = 'ACTIVE' THEN 'PLANNED'::"CalendarEventStatus"
    WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'::"CalendarEventStatus"
    ELSE 'PLANNED'::"CalendarEventStatus"
  END;

ALTER TABLE "reservations" DROP COLUMN "status";
ALTER TABLE "reservations" RENAME COLUMN "status_new" TO "status";

-- Add reserved_by column to reservations
ALTER TABLE "reservations" ADD COLUMN "reserved_by" TEXT;

-- DropEnum (old enums)
DROP TYPE "ScheduleStatus";
DROP TYPE "RentalStatus";
DROP TYPE "EventStatus";
DROP TYPE "ReservationStatus";
