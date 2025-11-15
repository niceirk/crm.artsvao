-- AlterTable: Change roomIds array to single roomId
-- Step 1: Add new column room_id
ALTER TABLE "events" ADD COLUMN "room_id" TEXT;

-- Step 2: Migrate data - take first room from array if exists
UPDATE "events" SET "room_id" = "room_ids"[1] WHERE array_length("room_ids", 1) > 0;

-- Step 3: Drop old column
ALTER TABLE "events" DROP COLUMN "room_ids";

-- Step 4: Make room_id NOT NULL
ALTER TABLE "events" ALTER COLUMN "room_id" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "events" ADD CONSTRAINT "events_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Create index
CREATE INDEX "events_room_id_idx" ON "events"("room_id");
