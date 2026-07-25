-- Phone sign-in for the native iOS/Android apps.
--
-- Additive and safe to run against live data: both columns are nullable, so
-- every existing row stays valid and email remains the required identity.
--
-- The unique index is created with a NULL-tolerant definition (Postgres treats
-- NULLs as distinct in a UNIQUE index), so the many existing phone-less
-- accounts do not collide with each other.
ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
