-- CreateTable
CREATE TABLE "LifecycleAutomationRun" (
    "id" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL,
    "campaignKey" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LifecycleAutomationRun_campaignKey_createdAt_idx" ON "LifecycleAutomationRun"("campaignKey", "createdAt");

-- CreateIndex
CREATE INDEX "LifecycleAutomationRun_triggerType_createdAt_idx" ON "LifecycleAutomationRun"("triggerType", "createdAt");

-- CreateIndex
CREATE INDEX "LifecycleAutomationRun_batchKey_idx" ON "LifecycleAutomationRun"("batchKey");
