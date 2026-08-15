-- What an astrologer remembers about a seeker, between sessions.
--
-- A NEW table, so the deploy ordering is forgiving: nothing selects from it
-- until the feature ships, and adding a column to a model the app already
-- queries would 500 every read with P2022 in the window between deploy and
-- migrate.
--
-- The unique on (userId, astrologerId) is the design, not an optimisation.
-- Memory belongs to the PAIRING — two astrologers who have both spoken to the
-- same seeker know different things about them — and the constraint is what
-- makes the write an idempotent upsert rather than a read-then-insert race at
-- the end of a session.
--
-- ON DELETE CASCADE from User: this is conversational content about a person,
-- so it has to disappear with them. Account deletion is a shipped feature and
-- a row surviving it would be exactly the kind of leftover the 7-day deletion
-- flow exists to prevent. Cascading from Astrologer too — a removed persona
-- should not leave its notes behind.
CREATE TABLE "consultation_memories" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "astrologerId"  TEXT NOT NULL,
    "summary"       TEXT NOT NULL,
    "sessionCount"  INTEGER NOT NULL DEFAULT 0,
    "lastSessionAt" TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_memories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consultation_memories_userId_astrologerId_key"
    ON "consultation_memories"("userId", "astrologerId");

-- Serves the astrologer's own desk: "who have I spoken to, most recent first".
CREATE INDEX "consultation_memories_astrologerId_updatedAt_idx"
    ON "consultation_memories"("astrologerId", "updatedAt");

ALTER TABLE "consultation_memories"
    ADD CONSTRAINT "consultation_memories_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consultation_memories"
    ADD CONSTRAINT "consultation_memories_astrologerId_fkey"
    FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
