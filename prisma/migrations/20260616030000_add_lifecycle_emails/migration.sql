-- CreateTable
CREATE TABLE "LifecycleEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignKey" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifecycleEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleEmail_dedupeKey_key" ON "LifecycleEmail"("dedupeKey");

-- CreateIndex
CREATE INDEX "LifecycleEmail_userId_campaignKey_idx" ON "LifecycleEmail"("userId", "campaignKey");

-- CreateIndex
CREATE INDEX "LifecycleEmail_campaignKey_createdAt_idx" ON "LifecycleEmail"("campaignKey", "createdAt");

-- AddForeignKey
ALTER TABLE "LifecycleEmail" ADD CONSTRAINT "LifecycleEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
