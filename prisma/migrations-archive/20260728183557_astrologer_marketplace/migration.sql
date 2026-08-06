-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "astrologers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "languages" TEXT[],
    "specialities" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "revenueSharePct" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "payoutAccountRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "astrologers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CHAT',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "blocksCharged" INTEGER NOT NULL DEFAULT 0,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "billedSeconds" INTEGER NOT NULL DEFAULT 0,
    "secondsPerBlock" INTEGER NOT NULL,
    "creditValuePaise" INTEGER NOT NULL,
    "revenueSharePct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_messages" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "consultation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "astrologer_earnings" (
    "id" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "creditsServed" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "astrologer_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "creditsServed" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "astrologers_userId_key" ON "astrologers"("userId");

-- CreateIndex
CREATE INDEX "astrologers_status_isAvailable_idx" ON "astrologers"("status", "isAvailable");

-- CreateIndex
CREATE INDEX "consultations_userId_createdAt_idx" ON "consultations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "consultations_astrologerId_createdAt_idx" ON "consultations"("astrologerId", "createdAt");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- CreateIndex
CREATE INDEX "consultations_status_deadlineAt_idx" ON "consultations"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "consultation_messages_consultationId_sentAt_idx" ON "consultation_messages"("consultationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "astrologer_earnings_consultationId_key" ON "astrologer_earnings"("consultationId");

-- CreateIndex
CREATE INDEX "astrologer_earnings_astrologerId_createdAt_idx" ON "astrologer_earnings"("astrologerId", "createdAt");

-- CreateIndex
CREATE INDEX "astrologer_earnings_payoutId_idx" ON "astrologer_earnings"("payoutId");

-- CreateIndex
CREATE INDEX "payouts_astrologerId_periodEnd_idx" ON "payouts"("astrologerId", "periodEnd");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- AddForeignKey
ALTER TABLE "astrologers" ADD CONSTRAINT "astrologers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_messages" ADD CONSTRAINT "consultation_messages_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "astrologer_earnings" ADD CONSTRAINT "astrologer_earnings_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "astrologer_earnings" ADD CONSTRAINT "astrologer_earnings_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "astrologer_earnings" ADD CONSTRAINT "astrologer_earnings_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

