-- Appointments: bookable future sessions, and the windows they are booked in.
--
-- PURELY ADDITIVE. Two new tables, no ALTER on anything that exists, so code
-- currently deployed keeps working after this is applied. It still has to be
-- applied BEFORE the code that reads these tables ships — Prisma SELECTs every
-- column, so the appointment routes would 500 with P2022 against a database
-- that has not seen this.
--
-- The unique index on (astrologerId, startAt) is the real defence against
-- double-booking. Two confirmations racing is exactly the case an
-- application-level "is this slot free?" check loses.

-- CreateTable
CREATE TABLE "astrologer_availability" (
    "id" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "astrologer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "blocks" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "counterAt" TIMESTAMP(3),
    "counterNote" TEXT,
    "secondsPerBlock" INTEGER,
    "creditsPerBlock" INTEGER,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "consultationId" TEXT,
    "remindedDayBefore" BOOLEAN NOT NULL DEFAULT false,
    "remindedHourBefore" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "astrologer_availability_astrologerId_dayOfWeek_idx" ON "astrologer_availability"("astrologerId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_ref_key" ON "appointments"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_consultationId_key" ON "appointments"("consultationId");

-- CreateIndex
CREATE INDEX "appointments_astrologerId_status_startAt_idx" ON "appointments"("astrologerId", "status", "startAt");

-- CreateIndex
CREATE INDEX "appointments_userId_startAt_idx" ON "appointments"("userId", "startAt");

-- CreateIndex
CREATE INDEX "appointments_status_startAt_idx" ON "appointments"("status", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_astrologerId_startAt_key" ON "appointments"("astrologerId", "startAt");

-- AddForeignKey
ALTER TABLE "astrologer_availability" ADD CONSTRAINT "astrologer_availability_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

