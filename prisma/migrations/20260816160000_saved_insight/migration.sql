-- Something a seeker chose to keep.
--
-- A NEW table, so deploy ordering is forgiving: nothing selects from it until
-- the feature ships. Adding a column to a model the app already queries would
-- 500 every read with P2022 between deploy and migrate.
--
-- Replaces a localStorage key (`chetna-saved-insights`) that was written to and
-- never read. The body is stored here rather than referenced from the Question
-- row it came from, deliberately: what someone kept should stay as it read when
-- they kept it, not change because a prompt was retuned.
--
-- ON DELETE CASCADE from User: account deletion is a shipped feature and this
-- is content belonging to a person.
CREATE TABLE "saved_insights" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "source"    TEXT NOT NULL,
    "href"      TEXT,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "context"   JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_insights_pkey" PRIMARY KEY ("id")
);

-- Serves the only query there is: this seeker's, newest first.
CREATE INDEX "saved_insights_userId_createdAt_idx"
    ON "saved_insights"("userId", "createdAt");

ALTER TABLE "saved_insights"
    ADD CONSTRAINT "saved_insights_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
