-- Which language the AI writes in.
--
-- A column on a widely-queried model, which is the case the house rules single
-- out: Prisma SELECTs every column by default, so the app 500s with P2022 on
-- every User read between deploy and migrate. Deploy migration-FIRST.
--
-- NOT NULL with a default rather than nullable: every existing row gets "en",
-- which is what they were already receiving, so there is no state in which the
-- column is undefined and callers have to decide what a null means.
ALTER TABLE "User" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
