-- What a seeker agrees to be told about, and what has already been sent.
--
-- Two NEW tables, so deploy ordering is forgiving: nothing selects from them
-- until the feature ships. Adding columns to User instead would have widened a
-- table read on nearly every request, and 500'd every one of those reads with
-- P2022 between deploy and migrate.
CREATE TABLE "notification_preferences" (
    "userId"        TEXT NOT NULL,
    "dailyGuidance" BOOLEAN NOT NULL DEFAULT false,
    "periodChange"  BOOLEAN NOT NULL DEFAULT true,
    "appointments"  BOOLEAN NOT NULL DEFAULT true,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The dedup ledger. The UNIQUE on dedupeKey is not an optimisation: it is the
-- only thing standing between an hourly sweep and sending the same notice every
-- hour for as long as its event stays inside the window.
CREATE TABLE "notifications_sent" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind"      TEXT NOT NULL,
    "sentAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_sent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_sent_dedupeKey_key" ON "notifications_sent"("dedupeKey");
CREATE INDEX "notifications_sent_userId_sentAt_idx" ON "notifications_sent"("userId", "sentAt");

ALTER TABLE "notifications_sent"
    ADD CONSTRAINT "notifications_sent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
