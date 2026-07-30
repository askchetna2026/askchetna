-- AI astrologer personas, and per-astrologer pricing.
--
-- Every change here is additive or widening, so existing rows and the currently
-- deployed code keep working:
--   * the new astrologer columns are nullable or defaulted
--   * userId DROP NOT NULL widens the column; existing values are untouched
--   * consultations.creditsPerBlock defaults to 1, which is exactly what every
--     session billed before per-astrologer pricing existed
--
-- Prisma SELECTs every column, so this must be applied BEFORE the code that
-- references the new fields is deployed, or reads 500 with P2022.

-- AlterTable
ALTER TABLE "astrologers" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiSystemPrompt" TEXT,
ADD COLUMN     "creditsPerBlock" INTEGER,
ADD COLUMN     "isAI" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "creditsPerBlock" INTEGER NOT NULL DEFAULT 1;
