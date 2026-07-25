# Baselines a database whose schema predates Prisma migrations.
#
# WHY THIS EXISTS
# The AskChetna databases were built with `prisma db push`, which creates the
# schema but records nothing in _prisma_migrations. Prisma therefore believes no
# migration has ever run, and `migrate deploy` tries to replay
# 20251222140927_init, hits `CREATE TABLE "User"` on a table that already exists,
# and fails.
#
# `migrate resolve --applied` marks a migration as already-applied WITHOUT running
# its SQL. Baseline the ones whose changes are already present, then `migrate
# deploy` applies only the genuinely missing ones.
#
# THERE ARE THREE SEPARATE DATABASES — one per environment, each at a different
# point in migration history. Both parameters are mandatory precisely so this
# cannot be aimed at the wrong one by accident:
#
#   .env.local     project udwxykemnpyvdlsnwwrl
#   .env.preview   project qtyxqebsdpuflngwczvk
#   .env.prod      project rrbzhkevlpyfaiesarbo
#
# HOW TO FIND THE RIGHT -UpTo VALUE
# Ask the database what it is missing, which is authoritative:
#
#   npx dotenv -e <envfile> -- npx prisma migrate diff `
#     --from-schema-datasource prisma/schema.prisma `
#     --to-schema-datamodel prisma/schema.prisma --script
#
# Everything that diff does NOT mention is already present, so -UpTo is the last
# migration before the first one whose changes appear in that output.
#
# KNOWN VALUES (verified 2026-07-26)
#   .env.local    already fully baselined and migrated — nothing to do
#   .env.preview  -UpTo 20260502152000_add_welcome_bonus_notified_at
#                 (init, credit_requests and welcome_bonus are present; the
#                  newsletter, analytics visitorId, lifecycle and all four mobile
#                  migrations are genuinely missing and must actually run)
#   .env.prod     UNVERIFIED — run the diff above before assuming
#
# USAGE
#   .\scripts\baseline-migrations.ps1 -EnvFile .env.preview -UpTo 20260502152000_add_welcome_bonus_notified_at
#   npm run migrate:preview

param(
    [Parameter(Mandatory = $true)]
    [string]$EnvFile,

    [Parameter(Mandatory = $true)]
    [string]$UpTo
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
    Write-Host "Env file not found: $EnvFile" -ForegroundColor Red
    exit 1
}

$migrationsDir = Join-Path $PSScriptRoot '..\prisma\migrations'

# Ordered by name, which for timestamp-prefixed directories is chronological.
$all = @()
foreach ($dir in Get-ChildItem -Path $migrationsDir -Directory | Sort-Object Name) {
    if (-not (Test-Path (Join-Path $dir.FullName 'migration.sql'))) {
        # A directory with no migration.sql is an abandoned `migrate dev
        # --create-only`; Prisma rejects it with P3017.
        Write-Host "  !! skipping $($dir.Name) - no migration.sql" -ForegroundColor Yellow
        continue
    }
    $all += $dir.Name
}

if ($all -notcontains $UpTo) {
    Write-Host "-UpTo '$UpTo' is not a known migration. Available:" -ForegroundColor Red
    $all | ForEach-Object { Write-Host "  $_" }
    exit 1
}

$cutoff = $all.IndexOf($UpTo)
$toBaseline = $all[0..$cutoff]
$toApply = if ($cutoff + 1 -lt $all.Count) { $all[($cutoff + 1)..($all.Count - 1)] } else { @() }

Write-Host "Database: $EnvFile" -ForegroundColor Cyan
Write-Host "`nWill mark as applied WITHOUT running SQL ($($toBaseline.Count)):" -ForegroundColor Cyan
$toBaseline | ForEach-Object { Write-Host "  $_" }
Write-Host "`nWill be left for 'migrate deploy' to actually run ($($toApply.Count)):" -ForegroundColor Yellow
if ($toApply.Count -eq 0) { Write-Host "  (none)" } else { $toApply | ForEach-Object { Write-Host "  $_" } }
Write-Host ""

foreach ($migration in $toBaseline) {
    Write-Host "  -> $migration"

    # Output captured so an "already recorded" result is tolerated, making the
    # script safe to re-run after a partial pass.
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

Write-Host "`nBaseline complete." -ForegroundColor Green
Write-Host "Now apply the rest, then confirm:" -ForegroundColor Green
switch ($EnvFile) {
    '.env.preview' { Write-Host "  npm run migrate:preview; npm run migrate:status:preview" }
    '.env.prod' { Write-Host "  npm run migrate:prod; npm run migrate:status:prod" }
    default { Write-Host "  npm run migrate:local; npm run migrate:status" }
}
