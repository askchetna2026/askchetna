# One-time migration baselining.
#
# WHY THIS EXISTS
# The AskChetna database was created with `prisma db push`, which builds the
# schema but records nothing in the _prisma_migrations table. The result is a
# database whose schema is fully up to date while Prisma believes no migration
# has ever run.
#
# `prisma migrate deploy` in that state tries to replay 20251222140927_init,
# hits `CREATE TABLE "User"` on a table that already exists, and fails.
#
# `migrate resolve --applied` marks a migration as already-applied WITHOUT
# executing its SQL. Running it for the eight pre-existing migrations aligns the
# history with reality, after which `migrate deploy` will apply only genuinely
# pending migrations.
#
# Verified safe before writing this: `prisma migrate diff` against the live
# database reported the ONLY difference from the schema to be the two new
# User.phone columns -- so all eight migrations below really are already present.
#
# Run once:   .\scripts\baseline-migrations.ps1
# Then:       npm run migrate:local

# Defaults to local; pass -EnvFile .env.prod to baseline production.
# (param must be the first statement in a PowerShell script.)
param(
    [string]$EnvFile = '.env.local'
)

$ErrorActionPreference = 'Stop'

$alreadyApplied = @(
    '20251222140927_init',
    '20260502124000_add_credit_requests',
    '20260502152000_add_welcome_bonus_notified_at',
    '20260615233000_add_newsletter_subscribers',
    '20260616013000_add_analytics_visitor_id',
    '20260616030000_add_lifecycle_emails',
    '20260616043000_add_lifecycle_automation_runs',
    '20260616060000_add_lifecycle_automation_unique_batch'
)

Write-Host "Baselining $($alreadyApplied.Count) existing migrations using $EnvFile" -ForegroundColor Cyan
Write-Host "(marks them applied without running their SQL)`n"

foreach ($migration in $alreadyApplied) {
    Write-Host "  -> $migration"
    npx dotenv -e $EnvFile -- npx prisma migrate resolve --applied $migration
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nFailed on $migration. Stopping so nothing is half-baselined." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nBaseline complete. Verify with:  npm run migrate:status" -ForegroundColor Green
Write-Host "Then apply the new migration with:  npm run migrate:local" -ForegroundColor Green
