-- The AI-written "how today reads for you" note on the logged-in home.
--
-- A NEW table, deliberately: adding a column to a model the app already selects
-- from would 500 every read with P2022 between deploy and migrate. Nothing
-- queries this until the feature ships, so the ordering is forgiving.
--
-- The unique (userId, date) is the whole point of the table. It is what limits
-- the model to one call per seeker per calendar day; the browser's localStorage
-- copy is only a display cache and cannot be trusted to hold spend down.
CREATE TABLE "DailyInsight" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "date"      TEXT NOT NULL,
    "content"   JSONB NOT NULL,
    "profileId" TEXT,
    "dashaLord" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyInsight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyInsight_userId_date_key" ON "DailyInsight"("userId", "date");
CREATE INDEX "DailyInsight_userId_date_idx" ON "DailyInsight"("userId", "date");

ALTER TABLE "DailyInsight"
    ADD CONSTRAINT "DailyInsight_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
