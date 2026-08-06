# Baseline

This single migration creates the schema in full. It replaces sixteen earlier
migrations, now kept for reference in `prisma/migrations-archive/`.

## Why they were replaced

The old history could not rebuild the database. It had been baselined onto a
database originally created with `db push`, so `20251222140927_init` creates
seven tables while the schema declares thirty-three — twenty-six had no `CREATE`
anywhere. Replaying it against an empty project reached the first migration that
`ALTER`ed a table nothing had ever created and stopped:

    Applying 20260616013000_add_analytics_visitor_id
    Error: P3018 — relation "AnalyticsEvent" does not exist

Which meant production could not have been rebuilt from this repository.

## What this does not do

It carries no history. The archived files are the record of how the schema got
here; this one only states where it arrived. That is the trade a squash makes,
and it is the right one when the alternative is a history that cannot run.

## Existing databases

They were baselined onto this rather than re-run:

    dotenv -e .env.<name> -- prisma migrate resolve --applied 00000000000000_baseline

with the superseded rows removed from `_prisma_migrations` first. Nothing was
dropped or recreated — that table is bookkeeping, not data.
