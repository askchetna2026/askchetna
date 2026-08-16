-- What a seeker thought of one consultation.
--
-- A NEW table, so deploy ordering is forgiving: nothing selects from it until
-- the feature ships, and adding a column to a model the app already queries
-- would 500 every read with P2022 between deploy and migrate.
--
-- The unique on consultationId is the integrity model, not an optimisation. A
-- rating belongs to a SESSION, so it can only come from someone who had that
-- session and only once; ratings detached from a session are the ones that can
-- be manufactured. It also makes the write an idempotent upsert rather than a
-- read-then-insert race when someone double-taps submit.
--
-- ON DELETE CASCADE from User: this is content a person wrote, and it has to
-- disappear with them — account deletion is a shipped feature. Cascading from
-- Astrologer too, so a removed persona does not leave orphaned reviews.
CREATE TABLE "consultation_ratings" (
    "id"             TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "astrologerId"   TEXT NOT NULL,
    "stars"          INTEGER NOT NULL,
    "feedback"       TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consultation_ratings_consultationId_key"
    ON "consultation_ratings"("consultationId");

-- Serves the astrologer's card: the aggregate, and newest feedback first.
CREATE INDEX "consultation_ratings_astrologerId_createdAt_idx"
    ON "consultation_ratings"("astrologerId", "createdAt");

ALTER TABLE "consultation_ratings"
    ADD CONSTRAINT "consultation_ratings_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consultation_ratings"
    ADD CONSTRAINT "consultation_ratings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consultation_ratings"
    ADD CONSTRAINT "consultation_ratings_astrologerId_fkey"
    FOREIGN KEY ("astrologerId") REFERENCES "astrologers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
