/**
 * One-off repair for the two ways Profile rows went wrong.
 *
 *   1. DUPLICATES. The chart page's varga backfill used to save through
 *      `POST /api/profiles`, which creates. Every visit by a profile whose
 *      stored chart predated vargas minted another copy, and at the profile
 *      limit deactivated the user's oldest one to make room.
 *
 *   2. BLOAT. `chartData` carried a `transits` subtree — a whole second chart,
 *      for "now", with its own vargas and its own dasha tree — plus dasha
 *      levels below antardasha that nothing reads back. Measured at 1.57MB
 *      average and 7.5MB worst case, against ~43KB of chart anyone uses. These
 *      rows are sent to the browser on navigations that touch a profile, so it
 *      is page-load cost, not just disk.
 *
 * Both causes are fixed in the application. This rewrites what they left
 * behind. Compaction reuses prepareChartForStorage, so the result is exactly
 * what a fresh save would produce.
 *
 * DRY RUN BY DEFAULT — prints what it would do and writes nothing. Pass
 * --apply to commit. Deletes are irreversible; take a backup first.
 *
 * Usage (each targets a DIFFERENT database — check the fingerprint it prints):
 *   npm run compact:charts             # .env.local,   dry run
 *   npm run compact:charts:preview     # .env.preview, dry run
 *   npm run compact:charts:prod        # .env.prod,    dry run
 *   ... -- --apply                     # same, but writes
 */

import { PrismaClient } from '@prisma/client';
import { prepareChartForStorage } from '../src/lib/astrology/chartStorage';

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient();

const bytes = (value: unknown) => JSON.stringify(value ?? null).length;
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** Birth identity. Two rows are the same profile only if ALL of it matches —
 *  a false-positive delete cannot be undone, so this is deliberately strict. */
function identityOf(p: {
    userId: string; name: string; dateOfBirth: Date; timeOfBirth: string;
    placeOfBirth: string; latitude: number; longitude: number; gender: string;
}) {
    return [
        p.userId, p.name.trim().toLowerCase(), p.dateOfBirth.toISOString(),
        p.timeOfBirth, p.placeOfBirth.trim().toLowerCase(),
        p.latitude.toFixed(6), p.longitude.toFixed(6), p.gender,
    ].join('|');
}

/**
 * Say which of the three databases this is about to touch.
 *
 * The project ref lives in the connection USERNAME (`postgres.<ref>`) — all
 * three Supabase projects share the pooler hostname, and `current_user` comes
 * back as plain `postgres` through the pooler, so neither the host nor the
 * server-side user identifies anything. The URL is the only honest source.
 */
async function fingerprint() {
    const url = process.env.DATABASE_URL ?? '';
    let ref = 'UNKNOWN';
    try {
        // Username only. The password is in here too and must not be printed.
        const user = decodeURIComponent(new URL(url).username);
        ref = user.includes('.') ? user.slice(user.indexOf('.') + 1) : user;
    } catch {
        /* leave UNKNOWN — reported below, not thrown */
    }

    const [row] = await prisma.$queryRawUnsafe<Array<{ db: string; profiles: bigint }>>(
        `SELECT current_database() db, (SELECT count(*) FROM "Profile") profiles;`
    );

    console.log(`supabase project : ${ref}`);
    console.log(`database         : ${row.db}  (${row.profiles} profiles)`);
    console.log(`mode             : ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}\n`);

    if (ref === 'UNKNOWN') {
        console.warn('  Could not read the project ref from DATABASE_URL — check which');
        console.warn('  environment file this ran with before passing --apply.\n');
    }
}

type Candidate = {
    id: string; name: string; isActive: boolean; createdAt: Date; updatedAt: Date;
    hasReport: boolean; hasVargas: boolean; unlocked: string[]; size: number;
};

/** Which copy survives, most important reason first. */
function pickKeeper(rows: Candidate[]): { keep: Candidate; reason: string } {
    const byReport = rows.filter((r) => r.hasReport);
    if (byReport.length === 1) return { keep: byReport[0], reason: 'only copy with a Report' };

    const active = rows.filter((r) => r.isActive);
    const pool = active.length ? active : rows;

    const withVargas = pool.filter((r) => r.hasVargas);
    const finalPool = withVargas.length ? withVargas : pool;

    const keep = [...finalPool].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const reasons = [
        active.length ? 'active' : 'none active',
        withVargas.length ? 'has vargas' : 'no vargas anywhere',
        'most recently updated',
    ];
    return { keep, reason: reasons.join(', ') };
}

async function dedupe() {
    console.log('=== 1. duplicate profiles ===\n');

    const profiles = await prisma.profile.findMany({
        select: {
            id: true, userId: true, name: true, dateOfBirth: true, timeOfBirth: true,
            placeOfBirth: true, latitude: true, longitude: true, gender: true,
            isActive: true, createdAt: true, updatedAt: true, chartData: true,
            unlockedCharts: true, report: { select: { id: true } },
        },
    });

    const groups = new Map<string, Candidate[]>();
    for (const p of profiles) {
        const chart = p.chartData as Record<string, unknown> | null;
        const candidate: Candidate = {
            id: p.id, name: p.name, isActive: p.isActive,
            createdAt: p.createdAt, updatedAt: p.updatedAt,
            hasReport: p.report !== null,
            hasVargas: !!chart && 'vargas' in chart,
            unlocked: Array.isArray(p.unlockedCharts) ? (p.unlockedCharts as string[]) : [],
            size: bytes(p.chartData),
        };
        const key = identityOf(p);
        groups.set(key, [...(groups.get(key) ?? []), candidate]);
    }

    const doomed: string[] = [];
    let flagged = 0;
    let duplicateGroups = 0;

    for (const rows of groups.values()) {
        if (rows.length < 2) continue;
        duplicateGroups++;

        const { keep, reason } = pickKeeper(rows);
        const drop = rows.filter((r) => r.id !== keep.id);

        // Two guards against destroying something bought. Report cascades on
        // delete, and unlockedCharts is a paid entitlement; either one spread
        // across copies is a merge decision, not a script's call.
        const reportsAtRisk = drop.filter((r) => r.hasReport);
        const unlocksAtRisk = drop.filter((r) => r.unlocked.some((c) => !keep.unlocked.includes(c)));

        console.log(`  "${keep.name}" — ${rows.length} copies`);
        for (const r of rows) {
            const marks = [
                r.id === keep.id ? 'KEEP' : 'delete',
                r.isActive ? 'active' : 'inactive',
                r.hasVargas ? 'vargas' : 'NO vargas',
                r.hasReport ? 'HAS REPORT' : null,
                r.unlocked.length ? `unlocked:[${r.unlocked.join(',')}]` : null,
                kb(r.size),
            ].filter(Boolean);
            console.log(`      ${r.id}  ${marks.join('  ')}`);
        }

        if (reportsAtRisk.length || unlocksAtRisk.length) {
            flagged++;
            const why = [
                reportsAtRisk.length ? `${reportsAtRisk.length} copy/copies carry a Report` : null,
                unlocksAtRisk.length ? 'a copy holds chart unlocks the keeper lacks' : null,
            ].filter(Boolean).join('; ');
            console.log(`      -> SKIPPED for manual review: ${why}\n`);
            continue;
        }

        console.log(`      -> keeping ${keep.id} (${reason}); deleting ${drop.length}\n`);
        doomed.push(...drop.map((r) => r.id));
    }

    if (!duplicateGroups) console.log('  none found\n');

    if (doomed.length && APPLY) {
        const { count } = await prisma.profile.deleteMany({ where: { id: { in: doomed } } });
        console.log(`  DELETED ${count} duplicate profiles\n`);
    }

    return { duplicateGroups, toDelete: doomed.length, flagged, doomed };
}

async function compact(skipIds: string[]) {
    console.log('=== 2. chart compaction ===\n');

    const profiles = await prisma.profile.findMany({
        where: { id: { notIn: skipIds } },
        select: { id: true, name: true, chartData: true },
    });

    let before = 0;
    let after = 0;
    let changed = 0;
    let biggest = { name: '', saved: 0 };

    for (const p of profiles) {
        if (p.chartData === null) continue;

        const sizeBefore = bytes(p.chartData);
        const prepared = prepareChartForStorage(p.chartData);
        const sizeAfter = bytes(prepared);

        before += sizeBefore;
        after += sizeAfter;
        if (sizeAfter >= sizeBefore) continue;

        changed++;
        const saved = sizeBefore - sizeAfter;
        if (saved > biggest.saved) biggest = { name: p.name, saved };

        if (APPLY) await prisma.profile.update({ where: { id: p.id }, data: { chartData: prepared } });
    }

    console.log(`  profiles scanned : ${profiles.length}`);
    console.log(`  rows to rewrite  : ${changed}`);
    console.log(`  chart JSON total : ${kb(before)} -> ${kb(after)}`);
    if (before > 0) {
        console.log(`  reduction        : ${(100 * (before - after) / before).toFixed(1)}%`);
    }
    if (biggest.saved) console.log(`  largest single   : "${biggest.name}" saves ${kb(biggest.saved)}`);
    console.log(APPLY ? `\n  REWROTE ${changed} rows\n` : '\n  (dry run — nothing written)\n');

    return { scanned: profiles.length, changed, before, after };
}

async function main() {
    await fingerprint();

    const dupes = await dedupe();
    // Skip the doomed rows either way: in a dry run they are still in the table
    // and would otherwise inflate the compaction figures with rows that --apply
    // deletes before it ever reaches them.
    const charts = await compact(dupes.doomed);

    console.log('=== summary ===');
    console.log(`  duplicate groups     : ${dupes.duplicateGroups}`);
    console.log(`  profiles to delete   : ${dupes.toDelete}`);
    console.log(`  groups needing review: ${dupes.flagged}`);
    console.log(`  charts to rewrite    : ${charts.changed} of ${charts.scanned}`);
    console.log(`  chart JSON           : ${kb(charts.before)} -> ${kb(charts.after)}`);
    if (!APPLY) console.log('\n  Nothing was written. Re-run with --apply to commit.');
}

main()
    .catch((error) => {
        console.error('\ncompact-charts failed:', error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
