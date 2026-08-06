-- Push notification device registrations for the native iOS/Android apps.
--
-- Additive: a new table only, no changes to existing ones.
--
-- The unique index is on `token`, not on (userId, token). An FCM token
-- identifies one app install, and that install can be handed to a different
-- account (sign out, sign in as someone else). Registration upserts on the token
-- and reassigns userId, so notifications can never reach the device's previous
-- owner. A per-user unique index would instead accumulate a stale row per
-- account and deliver to whoever signed in first.
--
-- Generated with `prisma migrate diff` against the live schema rather than
-- hand-written, so it matches exactly what Prisma expects.
-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "deviceModel" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_disabledAt_idx" ON "DeviceToken"("userId", "disabledAt");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
