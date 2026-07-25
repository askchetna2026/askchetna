-- App Store product identifier per pricing plan, for Apple In-App Purchase.
--
-- Additive and nullable: existing plans keep working unchanged on web and
-- Android, and only plans given an appleProductId become purchasable on iOS.
--
-- The unique index prevents two plans claiming the same App Store product, which
-- would make the product -> plan lookup in the RevenueCat webhook ambiguous and
-- could grant the wrong number of credits.
-- AlterTable
ALTER TABLE "PricingPlan" ADD COLUMN     "appleProductId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_appleProductId_key" ON "PricingPlan"("appleProductId");
