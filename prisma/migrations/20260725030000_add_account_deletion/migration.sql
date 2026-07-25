-- Account deletion with a grace period.
--
-- Required in-app by App Store guideline 5.1.1(v) AND Google Play's data
-- deletion policy, so this blocks both store submissions. Also services the
-- erasure right under India's DPDP Act and GDPR.
--
-- Additive and nullable: existing accounts are unaffected (NULL = not pending
-- deletion).
--
-- NOTE: contains only the User columns. The PricingPlan.appleProductId column
-- that `prisma migrate diff` also reports as pending belongs to
-- 20260725020000_add_apple_product_id and must not be duplicated here.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deletionScheduledFor" TIMESTAMP(3);

-- Lets the purge cron find due accounts without scanning the whole table.
CREATE INDEX "User_deletionScheduledFor_idx" ON "User"("deletionScheduledFor");
