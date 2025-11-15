-- AlterTable: Move age fields from studios to groups
ALTER TABLE "groups" ADD COLUMN "age_min" INTEGER;
ALTER TABLE "groups" ADD COLUMN "age_max" INTEGER;

-- AlterTable: Remove age fields from studios
ALTER TABLE "studios" DROP COLUMN "age_min";
ALTER TABLE "studios" DROP COLUMN "age_max";
