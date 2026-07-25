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

# Migrations that should be APPLIED for real rather than baselined, i.e. those
# whose SQL the database has genuinely never seen. Everything older than this is
# already present because the schema was built with `db push`.
$applyForReal = @(
    '20260725000000_add_user_phone'
)

# Derived from disk rather than hardcoded. An earlier version of this script
# listed names manually and choked on
# 20260616060000_add_lifecycle_automation_unique_batch -- a directory that
# existed with no migration.sql inside (leftover from an abandoned
# `migrate dev --create-only`). Prisma rejects such a directory with P3017, so
# they are detected and skipped here instead of halting the run.
$migrationsDir = Join-Path $PSScriptRoot '..\prisma\migrations'

$alreadyApplied = @()
foreach ($dir in Get-ChildItem -Path $migrationsDir -Directory | Sort-Object Name) {
    if (-not (Test-Path (Join-Path $dir.FullName 'migration.sql'))) {
        Write-Host "  !! skipping $($dir.Name) - no migration.sql (incomplete migration)" -ForegroundColor Yellow
        continue
    }
    if ($applyForReal -contains $dir.Name) { continue }
    $alreadyApplied += $dir.Name
}

if ($alreadyApplied.Count -eq 0) {
    Write-Host "Nothing to baseline." -ForegroundColor Yellow
    exit 0
}

Write-Host "Baselining $($alreadyApplied.Count) existing migrations using $EnvFile" -ForegroundColor Cyan
Write-Host "(marks them applied without running their SQL)`n"

foreach ($migration in $alreadyApplied) {
    Write-Host "  -> $migration"

    # Output is captured so an "already recorded" result can be tolerated,
    # making the script safe to re-run after a partial pass (P3008).
    $output = & npx dotenv -e $EnvFile -- npx prisma migrate resolve --applied $migration 2>&1
    $exit = $LASTEXITCODE
    $joined = $output -join "`n"

    if ($exit -eq 0) {
        Write-Host "     marked as applied" -ForegroundColor Green
        continue
    }

    if ($joined -match 'P3008' -or $joined -match 'already recorded') {
        Write-Host "     already baselined - skipping" -ForegroundColor DarkGray
        continue
    }

    Write-Host $joined
    Write-Host "`nFailed on $migration. Stopping so nothing is half-baselined." -ForegroundColor Red
    exit 1
}

Write-Host "`nBaseline complete. Verify with:  npm run migrate:status" -ForegroundColor Green
Write-Host "Then apply the new migration with:  npm run migrate:local" -ForegroundColor Green
