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

# Put the project's local binaries on PATH, exactly as `npm run` does, so `dotenv`
# and `prisma` can be invoked directly.
#
# The previous version used `npx dotenv -e ... -- npx prisma ...` and failed with
# "npm error could not determine executable to run". Two reasons, both avoided by
# not using npx at all:
#   1. The inner npx is spawned by dotenv-cli rather than by a shell, and on
#      Windows the extensionless `npx` shim is not directly executable.
#   2. `npx dotenv` is ambiguous in this project, which depends on BOTH `dotenv`
#      (a library with no bin) and `dotenv-cli` (which provides the `dotenv` bin).
$binDir = (Resolve-Path (Join-Path $PSScriptRoot '..\node_modules\.bin')).Path
if (-not (Test-Path (Join-Path $binDir 'dotenv.cmd'))) {
    Write-Host "dotenv-cli is not installed. Run: npm install" -ForegroundColor Red
    exit 1
}
$env:PATH = "$binDir;$env:PATH"

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
    # Arguments are built as an array and splatted so PowerShell passes each one
    # through verbatim. Written inline, PowerShell consumes the bare `--` as its
    # own end-of-parameters token and `--applied` was being dropped, leaving
    # prisma to complain that "--applied or --rolled-back must be part of the
    # command".
    $cmdArgs = @(
        '-e', $EnvFile,
        '--',
        'prisma', 'migrate', 'resolve', '--applied', $migration
    )

    # ErrorActionPreference is relaxed for this call only. In PowerShell 5.1,
    # `2>&1` on a native executable wraps each stderr line in an ErrorRecord, and
    # under 'Stop' that is terminating — so the script aborted before it could
    # inspect the output and recognise a tolerable P3008. Exit codes are checked
    # explicitly below instead.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & dotenv @cmdArgs 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference
    $joined = ($output | ForEach-Object { $_.ToString() }) -join "`n"

    if ($exitCode -eq 0) {
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

# Explicit success. Without this the script inherits $LASTEXITCODE from the final
# prisma call, which is non-zero whenever a migration was already baselined (P3008)
# — so a completely successful run reported failure.
exit 0
