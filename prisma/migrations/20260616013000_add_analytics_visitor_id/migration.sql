-- Add visitor tracking support for analytics funnels
ALTER TABLE "AnalyticsEvent"
ADD COLUMN "visitorId" TEXT;

CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");
