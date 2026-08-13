import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { readSchema } from './schema-graph.mjs';

const execFileAsync = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** How many rows travel in one INSERT. Large enough that a big table is not
 *  thousands of round trips, small enough to stay well inside Postgres'
 *  parameter ceiling on a wide row. */
const BATCH = 500;

/** Read in pages so a table with hundreds of thousands of rows is never held in
 *  memory in full. */
const PAGE = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// Environments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads a `.env.*` file.
 *
 * `dotenv.parse` rather than a regex, deliberately. These files each contain
 * COMMENTED-OUT `DATABASE_URL` lines alongside the live one — `.env.local` has
 * three — and matching the first occurrence reads a disabled line and reports
 * the wrong database. That has already produced one confidently wrong
 * diagnosis. dotenv honours `#` comments and last-wins, which is what the
 * Prisma CLI itself does.
 */
export function readEnvFile(file) {
    const path = join(ROOT, file);
    if (!existsSync(path)) return null;
    return dotenv.parse(readFileSync(path, 'utf8'));
}

export function listEnvFiles() {
    return readdirSync(ROOT)
        .filter((f) => /^\.env\.[A-Za-z0-9_-]+$/.test(f))
        .sort();
}

/**
 * What a connection string actually points at.
 *
 * The Supabase project lives in the USERNAME (`postgres.<ref>`), not the host —
 * every project shares `aws-1-....pooler.supabase.com`. Comparing hosts reports
 * that three different databases are the same one.
 */
export function describeUrl(raw) {
    if (!raw) return null;
    try {
        const u = new URL(raw);
        const user = decodeURIComponent(u.username);
        const ref = user.startsWith('postgres.') ? user.slice('postgres.'.length) : null;
        return {
            host: u.hostname,
            port: u.port || '5432',
            user,
            projectRef: ref,
            pooled: u.searchParams.get('pgbouncer') === 'true',
        };
    } catch {
        return null;
    }
}

/**
 * A Supabase key is a JWT whose payload names the project and the role it acts
 * as. Reading those two claims is the only reliable way to tell a service-role
 * key from an anon key pasted into the same variable — and that mistake is
 * SILENT, because an anon key against a private bucket returns an empty list
 * rather than a permission error. Storage then appears to be configured and
 * simply never works.
 *
 * Payload only. The signature is not verified and the key is never logged.
 */
function keyClaims(jwt) {
    try {
        return JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64').toString());
    } catch {
        return null;
    }
}

export function describeEnv(file) {
    const env = readEnvFile(file);
    if (!env) return { file, ok: false, error: 'File not found' };
    if (!env.DATABASE_URL) return { file, ok: false, error: 'No DATABASE_URL' };

    const db = describeUrl(env.DATABASE_URL);
    const direct = describeUrl(env.DIRECT_URL);
    const warnings = [];

    // ── Storage credentials ──
    const storageRef = (() => {
        try { return new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]; } catch { return null; }
    })();
    let serviceKeyRole = null;
    // Named individually. "No storage credentials" when one of the two is
    // present sends you looking at the variable you already set.
    const missingStorage = [
        !env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
        !env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean);
    if (missingStorage.length) {
        warnings.push(
            `${missingStorage.join(' and ')} ${missingStorage.length > 1 ? 'are' : 'is'} not set, ` +
            `so photos cannot be read or written for this environment.`
        );
    } else {
        if (storageRef && db?.projectRef && storageRef !== db.projectRef) {
            warnings.push(
                `NEXT_PUBLIC_SUPABASE_URL points at project ${storageRef} but DATABASE_URL points at ${db.projectRef} — storage and data are in different projects.`
            );
        }
        const claims = keyClaims(env.SUPABASE_SERVICE_ROLE_KEY);
        serviceKeyRole = claims?.role ?? 'unreadable';
        if (serviceKeyRole !== 'service_role') {
            warnings.push(
                `SUPABASE_SERVICE_ROLE_KEY holds a "${serviceKeyRole}" key, not a service_role key. Photo upload and signed URLs will fail silently — an anon key returns an empty list instead of a permission error.`
            );
        }
        if (claims?.ref && storageRef && claims.ref !== storageRef) {
            warnings.push(`The service key belongs to project ${claims.ref}, not ${storageRef}.`);
        }
        if (claims?.exp && claims.exp * 1000 < Date.now()) {
            warnings.push('The Supabase key has expired.');
        }
    }
    // The two ports are not interchangeable. 5432 is session mode and caps at 15
    // clients — a build or a burst of traffic exhausts it (EMAXCONNSESSION).
    if (db && db.port !== '6543') {
        warnings.push(`DATABASE_URL uses port ${db.port}; it should be 6543 with ?pgbouncer=true.`);
    }
    if (direct && direct.port !== '5432') {
        warnings.push(`DIRECT_URL uses port ${direct.port}; migrations need 5432.`);
    }
    if (!env.DIRECT_URL) warnings.push('No DIRECT_URL, so migrations cannot run against this environment.');

    return {
        file,
        ok: true,
        projectRef: db?.projectRef ?? null,
        host: db?.host ?? null,
        port: db?.port ?? null,
        user: db?.user ?? null,
        hasDirect: Boolean(env.DIRECT_URL),
        storageRef,
        serviceKeyRole,
        warnings,
    };
}

export function clientFor(file) {
    const env = readEnvFile(file);
    if (!env?.DATABASE_URL) throw new Error(`${file} has no DATABASE_URL.`);
    return new PrismaClient({
        datasources: { db: { url: env.DATABASE_URL } },
        log: [],
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Counting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Row counts for every model in the schema.
 *
 * A table the environment has never been migrated to reports `missing` rather
 * than zero. The difference matters: zero means "migrated and empty", missing
 * means "the copy will fail here", and conflating them is how you discover a
 * half-migrated database mid-restore.
 */
export async function countAll(file) {
    const { models } = readSchema();
    const prisma = clientFor(file);
    const counts = {};
    try {
        for (const m of models) {
            try {
                counts[m.name] = { rows: await prisma[m.key].count(), table: m.table };
            } catch (error) {
                const missing = /does not exist|P2021/i.test(String(error?.message));
                counts[m.name] = {
                    rows: null,
                    table: m.table,
                    error: missing ? 'missing' : String(error?.message ?? error).slice(0, 140),
                };
            }
        }
    } finally {
        await prisma.$disconnect();
    }
    return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structure
// ─────────────────────────────────────────────────────────────────────────────

/** Every column Postgres actually has, per table. */
async function describeStructure(file) {
    const prisma = clientFor(file);
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT table_name, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        `);
        const tables = new Map();
        for (const r of rows) {
            if (!tables.has(r.table_name)) tables.set(r.table_name, new Map());
            tables.get(r.table_name).set(r.column_name, {
                type: r.data_type,
                nullable: r.is_nullable === 'YES',
            });
        }
        return tables;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Compares what two databases actually LOOK like — not which migrations they
 * claim to have run.
 *
 * `migrate status` reads the `_prisma_migrations` bookkeeping table, so it will
 * happily report "up to date" for a database whose columns were changed by
 * hand, or where a migration failed halfway and was marked applied. Row counts
 * only notice a whole missing table. Neither catches a single absent column —
 * which is exactly the shape of the P2022 failures this project keeps hitting.
 *
 * The Prisma schema is the third opinion: a table the schema expects but that
 * neither database has is reported separately, because that is a migration
 * everybody is missing rather than a drift between the two.
 */
export async function validateStructure(fileA, fileB) {
    const { models } = readSchema();
    const [a, b] = await Promise.all([describeStructure(fileA), describeStructure(fileB)]);

    const expected = new Set(models.map((m) => m.table));
    const issues = [];

    for (const table of [...new Set([...a.keys(), ...b.keys()])]) {
        // Prisma's own bookkeeping differs legitimately between environments.
        if (table === '_prisma_migrations') continue;

        const inA = a.has(table);
        const inB = b.has(table);
        if (!inA || !inB) {
            issues.push({
                severity: expected.has(table) ? 'error' : 'warn',
                table,
                kind: 'missing-table',
                detail: `Present in ${inA ? fileA : fileB}, absent from ${inA ? fileB : fileA}.`,
            });
            continue;
        }

        const colsA = a.get(table);
        const colsB = b.get(table);
        for (const col of [...new Set([...colsA.keys(), ...colsB.keys()])]) {
            const ca = colsA.get(col);
            const cb = colsB.get(col);
            if (!ca || !cb) {
                issues.push({
                    severity: 'error',
                    table,
                    kind: 'missing-column',
                    detail: `Column "${col}" exists in ${ca ? fileA : fileB} but not in ${ca ? fileB : fileA}.`,
                });
                continue;
            }
            if (ca.type !== cb.type) {
                issues.push({
                    severity: 'error', table, kind: 'type',
                    detail: `Column "${col}" is ${ca.type} in ${fileA} and ${cb.type} in ${fileB}.`,
                });
            }
            if (ca.nullable !== cb.nullable) {
                issues.push({
                    severity: 'warn', table, kind: 'nullability',
                    detail: `Column "${col}" is ${ca.nullable ? 'nullable' : 'NOT NULL'} in ${fileA} and ` +
                        `${cb.nullable ? 'nullable' : 'NOT NULL'} in ${fileB}.`,
                });
            }
        }
    }

    // Tables the code will query that nobody has. This is the P2022 case: the
    // app 500s the moment a route selects from one of these.
    const missingEverywhere = models
        .filter((m) => !a.has(m.table) && !b.has(m.table))
        .map((m) => m.table);

    return {
        a: fileA,
        b: fileB,
        tablesA: [...a.keys()].filter((t) => t !== '_prisma_migrations').length,
        tablesB: [...b.keys()].filter((t) => t !== '_prisma_migrations').length,
        expectedTables: expected.size,
        missingEverywhere,
        issues,
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warn').length,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
//
// Photos live in a PER-PROJECT bucket, so a row copied between environments
// leaves `photoPath` pointing at an object that does not exist on the other
// side. The row arrives, the portrait 404s, and the avatar quietly falls back
// to an initial — which looks like a rendering bug rather than a missing file.
// Promoting an astrologer therefore has to move the object too.
// ─────────────────────────────────────────────────────────────────────────────

const PHOTO_BUCKET = 'astrologer-photos';

function storageFor(file) {
    const env = readEnvFile(file);
    if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Makes sure the destination project can actually take a photo.
 *
 * The key check comes FIRST, and that ordering is the whole point. An anon key
 * against a private bucket does not raise a permission error — `listBuckets`
 * simply returns an empty array, which reads exactly like "this project has no
 * buckets". Acting on that appearance would mean trying to create a bucket that
 * already exists, and reporting a storage problem as a missing-resource problem.
 * Production had precisely this: a real bucket, and an anon key in the variable
 * named SUPABASE_SERVICE_ROLE_KEY.
 *
 * A bucket is only created when the key is genuinely privileged, and PRIVATE to
 * match preview — photos are served through short-lived signed URLs, and a
 * public bucket would make every applicant's face guessable.
 */
async function ensureBucket(file, onProgress) {
    const env = readEnvFile(file);
    if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) {
        return { ok: false, error: `${file} has no Supabase storage credentials.` };
    }

    const role = keyClaims(env.SUPABASE_SERVICE_ROLE_KEY)?.role;
    if (role !== 'service_role') {
        return {
            ok: false,
            error: `${file}'s SUPABASE_SERVICE_ROLE_KEY holds a "${role ?? 'unreadable'}" key. ` +
                `Storage reads as empty and writes fail. Copy the service_role key from ` +
                `Supabase → Project Settings → API, and check Vercel's variables too.`,
        };
    }

    const client = storageFor(file);
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) return { ok: false, error: error.message };
    if ((buckets ?? []).some((b) => b.name === PHOTO_BUCKET)) return { ok: true, created: false };

    const { error: mkErr } = await client.storage.createBucket(PHOTO_BUCKET, { public: false });
    if (mkErr) return { ok: false, error: mkErr.message };
    onProgress?.({ message: `Created the private "${PHOTO_BUCKET}" bucket in ${file}.` });
    return { ok: true, created: true };
}

async function copyPhotoObject(sourceFile, destFile, path) {
    const from = storageFor(sourceFile);
    const to = storageFor(destFile);
    if (!from || !to) return { ok: false, error: 'Storage credentials missing for one side.' };

    const { data, error } = await from.storage.from(PHOTO_BUCKET).download(path);
    if (error || !data) return { ok: false, error: error?.message ?? 'Object not found at source.' };

    const bytes = Buffer.from(await data.arrayBuffer());
    // upsert, so re-promoting the same astrologer is idempotent rather than
    // failing on "already exists".
    const { error: upErr } = await to.storage.from(PHOTO_BUCKET).upload(path, bytes, {
        contentType: data.type || 'image/webp',
        upsert: true,
    });
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true, bytes: bytes.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Promoting astrologers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The astrologers in one environment, and whether each already exists in
 * another — so a promotion screen can show what is new before anything moves.
 */
export async function listAstrologers(sourceFile, destFile) {
    const source = clientFor(sourceFile);
    const dest = destFile ? clientFor(destFile) : null;
    try {
        const rows = await source.astrologer.findMany({
            orderBy: [{ isAI: 'asc' }, { displayName: 'asc' }],
            select: {
                id: true, displayName: true, isAI: true, status: true, userId: true,
                photoPath: true, photoUrl: true, languages: true, specialities: true,
                creditsPerBlock: true, revenueSharePct: true,
                user: { select: { email: true, name: true } },
            },
        });

        // The effective portrait: a self-published photo if there is one,
        // otherwise whatever the application carried. Resolving it here means
        // the destination never needs the application row — which keeps a pile
        // of applicant PII out of production.
        const withPhotos = await Promise.all(rows.map(async (a) => {
            let photoPath = a.photoPath;
            if (!photoPath && a.userId) {
                const app = await source.astrologerApplication.findFirst({
                    where: { userId: a.userId, profilePhotoPath: { not: null } },
                    orderBy: { submittedAt: 'desc' },
                    select: { profilePhotoPath: true },
                }).catch(() => null);
                photoPath = app?.profilePhotoPath ?? null;
            }
            return { ...a, effectivePhotoPath: photoPath };
        }));

        let existing = new Set();
        let nameClashes = new Map();
        const emailMatches = new Map();
        if (dest) {
            const there = await dest.astrologer.findMany({
                where: { id: { in: rows.map((r) => r.id) } },
                select: { id: true },
            });
            existing = new Set(there.map((r) => r.id));

            // The same persona seeded separately in two environments gets a
            // different id in each, so matching by id alone would promote a
            // second copy and leave the directory showing the name twice. This
            // is not hypothetical — `seed-ai-astrologers.mjs` is run per
            // environment, so every AI persona is in exactly this state.
            const sameName = await dest.astrologer.findMany({
                where: { displayName: { in: rows.map((r) => r.displayName) } },
                select: { id: true, displayName: true },
            });
            for (const d of sameName) {
                if (!rows.some((r) => r.id === d.id)) nameClashes.set(d.displayName, d.id);
            }

            // The same person signed up separately in each environment, so one
            // email maps to two different user ids. Copying the source row is
            // impossible (the email is unique) and deleting the destination's
            // account would cascade away their profiles, credits and history —
            // so the only sane move is to attach the profile to the account
            // that is already there.
            const emails = rows.map((r) => r.user?.email).filter(Boolean);
            if (emails.length) {
                const there = await dest.user.findMany({
                    where: { email: { in: emails } },
                    select: { id: true, email: true, astrologer: { select: { id: true, displayName: true } } },
                });
                for (const u of there) emailMatches.set(u.email, u);
            }
        }

        return withPhotos.map((a) => ({
            id: a.id,
            displayName: a.displayName,
            isAI: a.isAI,
            status: a.status,
            email: a.user?.email ?? null,
            languages: a.languages,
            specialities: a.specialities,
            creditsPerBlock: a.creditsPerBlock ?? 1,
            hasPhoto: Boolean(a.effectivePhotoPath),
            alreadyThere: existing.has(a.id),
            /** Destination has this NAME under a different id — promoting would
             *  produce two of them. */
            nameClashId: existing.has(a.id) ? null : (nameClashes.get(a.displayName) ?? null),
            /** What the destination already knows about this person's account.
             *  `sameId` means the promotion just works; `willLink` means the
             *  profile has to be attached to their existing account instead;
             *  `blocked` means that account is already an astrologer. */
            account: (() => {
                if (!a.user?.email) return { kind: a.userId ? 'unknown' : 'none' };
                const match = emailMatches.get(a.user.email);
                if (!match) return { kind: 'new', email: a.user.email };
                if (match.id === a.userId) return { kind: 'sameId', email: a.user.email };
                if (match.astrologer && match.astrologer.id !== a.id) {
                    return { kind: 'blocked', email: a.user.email, ownedBy: match.astrologer.displayName };
                }
                return { kind: 'willLink', email: a.user.email, destUserId: match.id };
            })(),
        }));
    } finally {
        await source.$disconnect();
        if (dest) await dest.$disconnect();
    }
}

/**
 * Copies chosen astrologers — and, for human ones, the account behind them —
 * into another environment.
 *
 * ADDITIVE. Nothing is truncated and no unrelated row is touched, which is the
 * whole point: this exists so a profile can be checked on preview and then
 * moved to production without carrying preview's consultations, earnings or
 * test users with it.
 *
 * Three decisions worth stating:
 *
 *   - `isAvailable` is forced FALSE at the destination. Presence is set by
 *     signing in; copying "on duty" across would put an astrologer in the live
 *     directory who is not actually at a keyboard there, and the first thing a
 *     seeker would learn is that nobody answers.
 *   - A destination account matching by EMAIL but not by id is a hard stop, not
 *     a merge. Relinking a real production user to a preview astrologer profile
 *     is not something to do silently.
 *   - Consultations, earnings, payouts and applications are never copied. They
 *     are per-environment history and would be fiction anywhere else.
 */
export async function promoteAstrologers({
    sourceFile, destFile, ids, includePhotos = true, linkExisting = true, onProgress,
}) {
    const source = clientFor(sourceFile);
    const dest = clientFor(destFile);
    const result = { promoted: [], skipped: [], photos: [], linked: [] };

    try {
        const astrologers = await source.astrologer.findMany({ where: { id: { in: ids } } });
        if (astrologers.length === 0) throw new Error('None of those astrologers exist in the source.');

        if (includePhotos) {
            const bucket = await ensureBucket(destFile, onProgress);
            if (!bucket.ok) {
                onProgress?.({ message: `Photos will be skipped — ${destFile} storage unusable: ${bucket.error}` });
                includePhotos = false;
            }
        }

        for (const a of astrologers) {
            const label = `${a.displayName}${a.isAI ? ' (AI)' : ''}`;
            /** Which account the DESTINATION profile should hang off. Usually
             *  the same id as the source, but not when the same person signed
             *  up separately in each environment. */
            let destUserId = a.userId;

            // ── The account behind a human astrologer ──
            if (a.userId) {
                const user = await source.user.findUnique({ where: { id: a.userId } });
                if (!user) {
                    result.skipped.push({ name: label, reason: 'Source astrologer references a user that does not exist.' });
                    onProgress?.({ message: `SKIPPED ${label} — orphaned user reference` });
                    continue;
                }

                const byId = await dest.user.findUnique({ where: { id: user.id }, select: { id: true } });
                if (!byId) {
                    const clash = await dest.user.findFirst({
                        where: {
                            OR: [
                                { email: user.email },
                                ...(user.phone ? [{ phone: user.phone }] : []),
                            ],
                        },
                        select: { id: true, email: true, astrologer: { select: { id: true, displayName: true } } },
                    });

                    if (clash) {
                        // That account is already somebody else's astrologer
                        // profile. `Astrologer.userId` is unique, so this cannot
                        // be resolved here at all.
                        if (clash.astrologer && clash.astrologer.id !== a.id) {
                            result.skipped.push({
                                name: label,
                                reason: `${destFile}'s account for ${clash.email} is already the astrologer "${clash.astrologer.displayName}". One account cannot hold two profiles.`,
                            });
                            onProgress?.({ message: `SKIPPED ${label} — that account is already an astrologer there` });
                            continue;
                        }
                        if (!linkExisting) {
                            result.skipped.push({
                                name: label,
                                reason: `${destFile} already has a different account using ${clash.email}. Turn on linking, or resolve it by hand.`,
                            });
                            onProgress?.({ message: `SKIPPED ${label} — email belongs to another account and linking is off` });
                            continue;
                        }
                        // Attach to the account that is already there rather
                        // than copying the source row. Deleting the destination
                        // account instead would cascade away their profiles,
                        // credits, journal and history — and take their OAuth
                        // sign-in links with it.
                        destUserId = clash.id;
                        result.linked.push({ name: label, email: clash.email, destUserId: clash.id });
                        onProgress?.({ message: `${label}: linked to the existing ${clash.email} account in ${destFile}` });
                    } else {
                        await dest.user.create({ data: user });

                        // Sign-in links travel with the account. Without these a
                        // Google or Apple astrologer arrives with a row they can
                        // never log in to — the password column is null for an
                        // OAuth user, so there is nothing else to authenticate
                        // against.
                        const accounts = await source.account.findMany({ where: { userId: user.id } });
                        if (accounts.length) {
                            await dest.account.createMany({ data: accounts, skipDuplicates: true });
                        }
                        onProgress?.({
                            message: `${label}: created account ${user.email}` +
                                (accounts.length ? ` with ${accounts.length} sign-in link(s)` : ' (password sign-in only)'),
                        });
                    }
                } else {
                    onProgress?.({ message: `${label}: account already present, left as is` });
                }
            }

            // ── The photo object, before the row that points at it ──
            let photoPath = a.photoPath;
            if (!photoPath && a.userId) {
                const app = await source.astrologerApplication.findFirst({
                    where: { userId: a.userId, profilePhotoPath: { not: null } },
                    orderBy: { submittedAt: 'desc' },
                    select: { profilePhotoPath: true },
                }).catch(() => null);
                photoPath = app?.profilePhotoPath ?? null;
            }

            let destPhotoPath = null;
            if (includePhotos && photoPath) {
                const moved = await copyPhotoObject(sourceFile, destFile, photoPath);
                if (moved.ok) {
                    destPhotoPath = photoPath;
                    result.photos.push({ name: label, path: photoPath, bytes: moved.bytes });
                    onProgress?.({ message: `${label}: photo copied (${moved.bytes} bytes)` });
                } else {
                    onProgress?.({ message: `${label}: photo NOT copied — ${moved.error}` });
                }
            }

            /**
             * Where the destination should look for this portrait.
             *
             * An AI persona's photo is a STATIC asset in the repo
             * (`/art/astrologers/vidhi.webp`), not an object in the bucket — it
             * needs no copying and exists identically in every environment.
             * Overwriting it with the bucket pointer erased those personas'
             * artwork on promotion, which is the bug this distinction fixes.
             * Only a pointer at an object we did not actually copy is unsafe,
             * because that is the one that 404s.
             */
            const sourcePointsAtBucket = a.photoUrl?.startsWith('/api/astrologers/');
            // Versioned by the object path, matching what the app writes — an
            // unversioned pointer is a cache key that never changes, so a later
            // photo change would stay invisible behind the edge cache.
            const version = destPhotoPath
                ? (destPhotoPath.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
                : null;
            const destPhotoUrl = destPhotoPath
                ? `/api/astrologers/${a.id}/photo?v=${version}`
                : (a.photoUrl && !sourcePointsAtBucket ? a.photoUrl : null);

            const data = {
                ...a,
                // Points at whichever account this profile belongs to AT THE
                // DESTINATION, which is not always the source's id.
                userId: destUserId,
                // Never arrive on duty. See the note above.
                isAvailable: false,
                lastSeenAt: null,
                // Points at the object actually present in the destination
                // bucket, or nothing — never at one that is not there.
                photoPath: destPhotoPath,
                photoUrl: destPhotoUrl,
            };

            await dest.astrologer.upsert({
                where: { id: a.id },
                create: data,
                update: data,
            });

            // The weekly schedule is a property of the profile, so it travels
            // with it — replaced wholesale rather than merged, exactly as the
            // astrologer's own editor does it.
            const windows = await source.astrologerAvailability.findMany({ where: { astrologerId: a.id } });
            await dest.astrologerAvailability.deleteMany({ where: { astrologerId: a.id } });
            if (windows.length) {
                await dest.astrologerAvailability.createMany({ data: windows });
            }

            result.promoted.push({ name: label, id: a.id, windows: windows.length, photo: Boolean(destPhotoPath) });
            onProgress?.({ message: `PROMOTED ${label} — ${windows.length} availability window(s)` });
        }
    } finally {
        await source.$disconnect();
        await dest.$disconnect();
    }

    return result;
}

/**
 * Repairs astrologers whose portrait exists but whose `photoUrl` pointer was
 * never written.
 *
 * Every profile approved before the publish-photo step shipped is in this
 * state: the application carries a photo, `/api/astrologers/[id]/photo` would
 * serve it, and the directory shows an initial because the denormalised column
 * is null. Nothing is uploaded or deleted here — it only writes the pointer
 * where a photo is genuinely resolvable.
 */
export async function backfillPhotoUrls(file, onProgress) {
    const prisma = clientFor(file);
    const fixed = [];
    const untouched = [];
    try {
        const rows = await prisma.astrologer.findMany({
            select: { id: true, displayName: true, photoUrl: true, photoPath: true, userId: true },
        });

        for (const a of rows) {
            // An unversioned pointer is repaired too — it works, but a later
            // photo change would sit behind the edge cache.
            const needsVersion = a.photoUrl?.startsWith('/api/astrologers/') && !a.photoUrl.includes('?v=');
            if (a.photoUrl && !needsVersion) {
                untouched.push({ name: a.displayName, why: 'already set' });
                continue;
            }

            let resolvedPath = a.photoPath ?? null;
            if (!resolvedPath && a.userId) {
                const app = await prisma.astrologerApplication.findFirst({
                    where: { userId: a.userId, profilePhotoPath: { not: null } },
                    orderBy: { submittedAt: 'desc' },
                    select: { profilePhotoPath: true },
                }).catch(() => null);
                resolvedPath = app?.profilePhotoPath ?? null;
            }

            if (!resolvedPath) { untouched.push({ name: a.displayName, why: 'no photo anywhere' }); continue; }

            const stem = (resolvedPath.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
            await prisma.astrologer.update({
                where: { id: a.id },
                data: { photoUrl: `/api/astrologers/${a.id}/photo?v=${stem}` },
            });
            fixed.push({ name: a.displayName, id: a.id });
            onProgress?.({ message: `${a.displayName}: pointer written` });
        }
    } finally {
        await prisma.$disconnect();
    }
    return { fixed, untouched };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure, then data, then proof — in one run.
 *
 * The free Supabase tier has no backups, so this is the substitute: point it at
 * an empty project and it builds the schema with `migrate deploy`, copies every
 * table, then counts both sides and refuses to call it a success unless they
 * agree. A backup nobody verified is a backup nobody has.
 */
export async function backupTo({ sourceFile, destFile, onProgress }) {
    // The structure check lives in copyAll now, so both this and the plain
    // "Replace data" path get it — and get the same one, rather than this being
    // the only route that looked.
    onProgress?.({ message: `Copying ${sourceFile} → ${destFile}…` });
    const report = await copyAll({ sourceFile, destFile, onProgress });

    onProgress?.({ message: 'Verifying by re-counting both sides…' });
    const [before, after] = await Promise.all([countAll(sourceFile), countAll(destFile)]);
    const mismatches = [];
    for (const [model, a] of Object.entries(before)) {
        const b = after[model];
        if ((a.rows ?? null) !== (b?.rows ?? null)) {
            mismatches.push({ model, source: a.rows, dest: b?.rows ?? null });
        }
    }

    if (mismatches.length) {
        onProgress?.({
            message: `VERIFICATION FAILED — ${mismatches.length} table(s) disagree: ` +
                mismatches.map((m) => `${m.model} ${m.source}≠${m.dest}`).join(', '),
        });
    } else {
        onProgress?.({ message: `Verified — all ${Object.keys(before).length} tables match.` });
    }

    return { report, mismatches };
}

// ─────────────────────────────────────────────────────────────────────────────
// Commercial view
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The numbers a commercial read of the business needs: who supplies the
 * marketplace, who buys, what was paid, what was consumed and what is owed.
 *
 * Everything here is READ from the app's own tables. Two consequences worth
 * stating rather than discovering later:
 *
 *   - Revenue is what the app RECORDED (`CreditPack.amount`, `Question.amount`),
 *     not what a payment provider settled. A Razorpay payment that never
 *     produced a row is invisible here, and a refund is not deducted. This is a
 *     product-side view, not a finance reconciliation.
 *   - Unspent credits are a LIABILITY, not income. They are reported separately
 *     from consumption for exactly that reason.
 */
export async function commercial(file) {
    const prisma = clientFor(file);
    const now = Date.now();
    const since = (days) => new Date(now - days * 86400000);

    // Any table can be absent in a half-migrated environment; a missing slice
    // should degrade that section, not blank the whole page.
    const safe = async (fn, fallback) => {
        try {
            return await fn();
        } catch {
            return fallback;
        }
    };

    try {
        const [
            users, users7, users30, profileOwners,
            astrologers, applications,
            packAgg, packByType, payingUsers,
            questionAgg, paidQuestions, reportsByStatus,
            consultByStatus, apptByStatus,
            earnAgg, earnUnpaid, payoutsByStatus,
            creditRequests,
        ] = await Promise.all([
            safe(() => prisma.user.count(), 0),
            safe(() => prisma.user.count({ where: { createdAt: { gte: since(7) } } }), 0),
            safe(() => prisma.user.count({ where: { createdAt: { gte: since(30) } } }), 0),
            safe(async () => (await prisma.profile.groupBy({ by: ['userId'] })).length, 0),

            safe(() => prisma.astrologer.findMany({
                select: { isAI: true, status: true, isAvailable: true, id: true, creditsPerBlock: true, revenueSharePct: true },
            }), []),
            safe(() => prisma.astrologerApplication.groupBy({ by: ['status'], _count: true }), []),

            safe(() => prisma.creditPack.aggregate({
                _sum: { questionsTotal: true, questionsUsed: true, amount: true }, _count: true,
            }), null),
            safe(() => prisma.creditPack.groupBy({
                by: ['packType'],
                _sum: { questionsTotal: true, questionsUsed: true, amount: true },
                _count: true,
            }), []),
            // Anyone who has ever paid for a pack. `amount` is paise, and a
            // welcome bonus is written with amount 0, which is what separates
            // the two populations.
            safe(async () => (await prisma.creditPack.findMany({
                where: { amount: { gt: 0 } }, distinct: ['userId'], select: { userId: true },
            })).length, 0),

            safe(() => prisma.question.count(), 0),
            // Money, defined as an amount actually recorded — NOT `isPaid`.
            // In production every question carries isPaid=true with a null
            // amount and no paymentId, because the flag means "a credit was
            // spent on this", not "someone paid for it". Counting it as
            // revenue would invent sales that never happened.
            safe(() => prisma.question.aggregate({
                where: { amount: { gt: 0 } }, _sum: { amount: true }, _count: true,
            }), null),
            safe(() => prisma.report.groupBy({ by: ['status'], _count: true }), []),

            safe(() => prisma.consultation.groupBy({
                by: ['status'], _count: true, _sum: { creditsCharged: true, billedSeconds: true },
            }), []),
            safe(() => prisma.appointment.groupBy({
                by: ['status'], _count: true, _sum: { creditsCharged: true },
            }), []),

            safe(() => prisma.astrologerEarning.aggregate({ _sum: { amountPaise: true, creditsServed: true }, _count: true }), null),
            safe(() => prisma.astrologerEarning.aggregate({ where: { payoutId: null }, _sum: { amountPaise: true } }), null),
            safe(() => prisma.payout.groupBy({ by: ['status'], _count: true, _sum: { amountPaise: true } }), []),

            safe(() => prisma.creditRequest.groupBy({ by: ['status'], _count: true }), []),
        ]);

        // Human and AI are the two sides of supply and behave nothing alike —
        // an AI persona has no payout, never sleeps and costs inference rather
        // than revenue share. Counting them together hides both.
        const tally = (list) => ({
            total: list.length,
            approved: list.filter((a) => a.status === 'APPROVED').length,
            pending: list.filter((a) => a.status === 'PENDING').length,
            suspended: list.filter((a) => a.status === 'SUSPENDED').length,
            rejected: list.filter((a) => a.status === 'REJECTED').length,
            onDuty: list.filter((a) => a.isAvailable && a.status === 'APPROVED').length,
        });
        const human = astrologers.filter((a) => !a.isAI);
        const ai = astrologers.filter((a) => a.isAI);

        // Sessions split by who served them. groupBy cannot join, and the
        // astrologer table is small, so the ids are matched directly.
        const aiIds = ai.map((a) => a.id);
        const humanIds = human.map((a) => a.id);
        const sessionSplit = async (ids) =>
            ids.length === 0
                ? { _count: 0, _sum: { creditsCharged: 0, billedSeconds: 0 } }
                : safe(() => prisma.consultation.aggregate({
                      where: { astrologerId: { in: ids } },
                      _count: true,
                      _sum: { creditsCharged: true, billedSeconds: true },
                  }), null);
        const [aiSessions, humanSessions] = await Promise.all([sessionSplit(aiIds), sessionSplit(humanIds)]);

        const granted = packAgg?._sum.questionsTotal ?? 0;
        const consumed = packAgg?._sum.questionsUsed ?? 0;
        const packRevenue = packAgg?._sum.amount ?? 0;
        const questionRevenue = paidQuestions?._sum.amount ?? 0;
        const earned = earnAgg?._sum.amountPaise ?? 0;
        const unpaid = earnUnpaid?._sum.amountPaise ?? 0;

        return {
            env: file,
            generatedAt: new Date().toISOString(),

            users: {
                total: users,
                new7: users7,
                new30: users30,
                withBirthProfile: profileOwners,
                paying: payingUsers,
                freeOnly: Math.max(0, users - payingUsers),
                conversionPct: users ? +((payingUsers / users) * 100).toFixed(1) : 0,
            },

            supply: {
                human: tally(human),
                ai: tally(ai),
                applications: Object.fromEntries(applications.map((r) => [r.status, r._count])),
            },

            credits: {
                packs: packAgg?._count ?? 0,
                granted,
                consumed,
                outstanding: granted - consumed,
                consumedPct: granted ? +((consumed / granted) * 100).toFixed(1) : 0,
                byType: packByType.map((r) => ({
                    packType: r.packType,
                    packs: r._count,
                    granted: r._sum.questionsTotal ?? 0,
                    consumed: r._sum.questionsUsed ?? 0,
                    revenuePaise: r._sum.amount ?? 0,
                })),
            },

            revenue: {
                packsPaise: packRevenue,
                paidQuestionsPaise: questionRevenue,
                totalPaise: packRevenue + questionRevenue,
                payingUsers,
                arpuPaise: payingUsers ? Math.round((packRevenue + questionRevenue) / payingUsers) : 0,
            },

            marketplace: {
                consultations: consultByStatus.map((r) => ({
                    status: r.status,
                    count: r._count,
                    credits: r._sum.creditsCharged ?? 0,
                    minutes: Math.round((r._sum.billedSeconds ?? 0) / 60),
                })),
                bySupply: {
                    human: {
                        sessions: humanSessions?._count ?? 0,
                        credits: humanSessions?._sum?.creditsCharged ?? 0,
                        minutes: Math.round((humanSessions?._sum?.billedSeconds ?? 0) / 60),
                    },
                    ai: {
                        sessions: aiSessions?._count ?? 0,
                        credits: aiSessions?._sum?.creditsCharged ?? 0,
                        minutes: Math.round((aiSessions?._sum?.billedSeconds ?? 0) / 60),
                    },
                },
                appointments: apptByStatus.map((r) => ({
                    status: r.status, count: r._count, credits: r._sum.creditsCharged ?? 0,
                })),
            },

            aiProduct: {
                questionsAsked: questionAgg,
                /** Questions where real money was recorded. See the note above —
                 *  this is deliberately not the `isPaid` count. */
                questionsWithMoney: paidQuestions?._count ?? 0,
                reports: Object.fromEntries(reportsByStatus.map((r) => [r.status, r._count])),
            },

            payouts: {
                earnedPaise: earned,
                unpaidPaise: unpaid,
                paidPaise: earned - unpaid,
                creditsServed: earnAgg?._sum.creditsServed ?? 0,
                settlements: payoutsByStatus.map((r) => ({
                    status: r.status, count: r._count, amountPaise: r._sum.amountPaise ?? 0,
                })),
                // What is left after the astrologers' share of what they served.
                // A proxy, not an accounting figure: it ignores inference cost,
                // payment fees and everything the AI side consumes.
                grossAfterShareePaise: packRevenue + questionRevenue - earned,
            },

            creditRequests: Object.fromEntries(creditRequests.map((r) => [r.status, r._count])),
        };
    } finally {
        await prisma.$disconnect();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `prisma migrate status`/`deploy` against one environment. The Prisma CLI
 * reads DIRECT_URL for both, which is why an environment without one is
 * flagged in describeEnv rather than failing here.
 *
 * Runs the CLI's own entrypoint under this Node binary rather than going
 * through `npx`. On Windows `npx` is a `.cmd`, and since the fix for
 * CVE-2024-27980 Node refuses to spawn a batch file without `shell: true` —
 * which fails as `spawn EINVAL`. Turning the shell on to work around it would
 * put an environment file's contents through a command line, so the entrypoint
 * is invoked directly instead: no shell, no quoting, and the same on every
 * platform.
 */
const PRISMA_CLI = join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');

async function prismaCli(file, args) {
    const env = readEnvFile(file);
    if (!env?.DATABASE_URL) throw new Error(`${file} has no DATABASE_URL.`);
    if (!existsSync(PRISMA_CLI)) throw new Error('Prisma CLI not found — run npm install.');

    try {
        const { stdout, stderr } = await execFileAsync(process.execPath, [PRISMA_CLI, ...args], {
            cwd: ROOT,
            env: {
                ...process.env,
                DATABASE_URL: env.DATABASE_URL,
                DIRECT_URL: env.DIRECT_URL ?? env.DATABASE_URL,
            },
            maxBuffer: 10 * 1024 * 1024,
        });
        return { ok: true, output: `${stdout}${stderr}`.trim() };
    } catch (error) {
        return {
            ok: false,
            output: `${error?.stdout ?? ''}${error?.stderr ?? ''}`.trim() || String(error?.message ?? error),
        };
    }
}

export const migrateStatus = (file) => prismaCli(file, ['migrate', 'status']);
export const migrateDeploy = (file) => prismaCli(file, ['migrate', 'deploy']);

/**
 * Builds the schema directly from `schema.prisma`, ignoring migration history.
 *
 * `--skip-generate` because regenerating the client mid-operation fights any
 * running dev server for the query-engine binary on Windows. No
 * `--accept-data-loss`, so a push that would DROP something refuses instead of
 * doing it quietly.
 */
export const dbPush = (file, acceptDataLoss = false) =>
    prismaCli(file, ['db', 'push', '--skip-generate', ...(acceptDataLoss ? ['--accept-data-loss'] : [])]);

/**
 * Does this database hold any rows at all, in any table it currently has?
 *
 * Used to decide whether a destructive schema change is allowed. "Empty" is a
 * far safer permission to act on than "the file is named like a backup" — a
 * mistyped environment cannot make a populated database look unpopulated.
 */
async function isEmptyDatabase(file) {
    const { models } = readSchema();
    const prisma = clientFor(file);
    try {
        for (const m of models) {
            try {
                if ((await prisma[m.key].count()) > 0) return false;
            } catch {
                // Table absent — nothing in it either way.
            }
        }
        return true;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Gives a destination the right shape, choosing the only tool that can.
 *
 * `migrate deploy` CANNOT build this database from nothing, and that is a
 * property of the project rather than a bug here: history was baselined onto a
 * database originally created with `db push`, so the `init` migration creates
 * seven tables while the schema declares thirty-three. Replaying it against an
 * empty project gets as far as the first migration that ALTERs a table nothing
 * ever created — `AnalyticsEvent` — and dies with P3018.
 *
 * So a destination missing tables is built with `db push`, which reads the
 * schema as it is now instead of replaying how it got here. A destination that
 * already matches is left alone. Migration history is not reproduced, which is
 * correct for a backup: what is wanted there is the shape of the data, not the
 * story of how the shape came about.
 */
export async function ensureStructure(file, onProgress, referenceFile = null) {
    const { models } = readSchema();
    const present = await describeStructure(file);
    const missingTables = models.filter((m) => !present.has(m.table)).map((m) => m.table);

    // Columns drift too, and a table-level check cannot see it.
    //
    // This is the failure that sent someone here: `.env.backup1` held all 33
    // tables but an older User, so the check passed, no push ran, and the copy
    // then tried to insert `whatsappOptIn` into a table without that column.
    // "All tables present" is not the same as "will accept the source's rows".
    //
    // The reference is the SOURCE database — the rows about to be copied are
    // the thing the destination has to be able to hold. The repair is still
    // schema.prisma (via db push), which is a superset of both in practice.
    const missingColumns = [];
    if (referenceFile) {
        const reference = await describeStructure(referenceFile);
        for (const m of models) {
            const here = present.get(m.table);
            const there = reference.get(m.table);
            if (!here || !there) continue; // a missing table is already covered above
            for (const col of there.keys()) {
                if (!here.has(col)) missingColumns.push(`${m.table}.${col}`);
            }
        }
    }

    if (missingTables.length === 0 && missingColumns.length === 0) {
        onProgress?.({
            message: `${file} already has all ${models.length} tables` +
                (referenceFile ? `, and every column ${referenceFile} has.` : '.'),
        });
        return { ok: true, method: 'none' };
    }

    if (missingTables.length) {
        onProgress?.({
            message: `${file} is missing ${missingTables.length} of ${models.length} tables. ` +
                `Building from schema.prisma — the migration history cannot replay onto an ` +
                `empty database, because it was baselined onto one that already existed.`,
        });
    }
    if (missingColumns.length) {
        onProgress?.({
            message: `${file} has every table but is missing ${missingColumns.length} column(s) ` +
                `that ${referenceFile} has: ${missingColumns.slice(0, 8).join(', ')}` +
                `${missingColumns.length > 8 ? `, and ${missingColumns.length - 8} more` : ''}. ` +
                `Bringing it up to schema.prisma before any row is copied.`,
        });
    }

    // A half-built database refuses changes it considers destructive — adding
    // the unique index on `User.phone`, for instance, because duplicates would
    // break it. On a database with no rows there is nothing to lose and nothing
    // to duplicate, so the objection is theoretical and the flag is safe. On one
    // holding data it is not, and the push is left to fail loudly instead.
    const empty = await isEmptyDatabase(file);
    onProgress?.({
        message: empty
            ? `${file} holds no rows, so schema changes cannot destroy anything.`
            : `${file} already holds data — destructive schema changes will be refused.`,
    });

    const pushed = await dbPush(file, empty);
    onProgress?.({ message: pushed.output || '(no output)' });
    if (!pushed.ok) {
        return {
            ok: false, method: 'db push',
            error: empty
                ? 'Could not build the schema.'
                : 'Could not build the schema without a change that would lose data. ' +
                  'Empty the destination first, or point at a fresh project.',
        };
    }

    // Trust nothing: confirm the structure is actually there before anything is
    // copied into it. Re-checks COLUMNS as well as tables — verifying only what
    // the old check looked at would report success for exactly the drift this
    // function was just extended to repair.
    const after = await describeStructure(file);
    const stillMissingTables = models.filter((m) => !after.has(m.table)).map((m) => m.table);
    const stillMissingColumns = missingColumns.filter((qualified) => {
        const [table, col] = qualified.split(/\.(.*)/s);
        return !after.get(table)?.has(col);
    });

    if (stillMissingTables.length || stillMissingColumns.length) {
        return {
            ok: false,
            method: 'db push',
            error: 'Still missing after the push: ' +
                [...stillMissingTables, ...stillMissingColumns].join(', '),
        };
    }

    onProgress?.({
        message: `All ${models.length} tables present in ${file}` +
            (missingColumns.length ? `, and the ${missingColumns.length} missing column(s) were added.` : '.'),
    });
    return { ok: true, method: 'db push' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace the destination's data with the source's.
 *
 * Truncates in reverse dependency order and inserts in forward order, so a
 * foreign key is never pointed at a row that has not arrived yet. CASCADE on
 * the truncate covers anything the schema graph cannot see.
 *
 * NOT a transaction spanning the whole copy, on purpose: thirty-three tables of
 * production data inside one transaction holds locks for minutes and will hit
 * the pooler's timeout long before it commits. The consequence is real and
 * worth stating plainly — an interrupted copy leaves the destination partly
 * filled, which is why this is offered for preview and local and gated behind a
 * typed confirmation for production.
 *
 * `onProgress` is called per table so the caller can stream a running log.
 */
export async function copyAll({ sourceFile, destFile, onProgress, dryRun = false }) {
    const { models } = readSchema();

    // Repair the destination's shape BEFORE touching its data.
    //
    // "Replace data" reached this function directly and never checked structure
    // at all, so a destination one migration behind the source failed partway
    // through the copy — after the truncate had already emptied it. Only the
    // backup path checked, and only for whole missing tables.
    //
    // A dry run is exempt: it writes nothing, and pushing schema changes to
    // answer a question nobody committed to would be a surprise.
    if (!dryRun) {
        const built = await ensureStructure(destFile, onProgress, sourceFile);
        if (!built.ok) {
            throw new Error(`${built.error} Nothing was copied into ${destFile}.`);
        }
    }

    const source = clientFor(sourceFile);
    const dest = clientFor(destFile);
    const report = [];

    try {
        // Refuse before destroying anything if the destination is not fully
        // migrated. Discovering a missing table after truncating twelve others
        // is the worst possible moment to find out.
        const missing = [];
        for (const m of models) {
            try {
                await dest[m.key].count();
            } catch {
                missing.push(m.table);
            }
        }
        if (missing.length) {
            throw new Error(
                `${destFile} is missing ${missing.length} table(s): ${missing.join(', ')}. ` +
                    `Apply the schema there first — nothing has been changed.`
            );
        }

        const tables = models.map((m) => `"public"."${m.table.replace(/"/g, '""')}"`);
        if (dryRun) {
            onProgress?.({
                phase: 'truncate',
                message: `DRY RUN — nothing will be written. ${tables.length} tables in ${destFile} would be emptied.`,
            });
        } else {
            onProgress?.({ phase: 'truncate', message: `Emptying ${tables.length} tables in ${destFile}…` });
            await dest.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(', ')} CASCADE;`);
            onProgress?.({ phase: 'truncate', message: 'Destination emptied.' });
        }

        for (const m of models) {
            let copied = 0;
            let cursor = null;

            for (;;) {
                // Cursor pagination where there is a single-column id, offset
                // otherwise. Offset on a table being written to can skip rows —
                // acceptable here only because the source is not expected to be
                // taking writes during a copy.
                const page = m.idField
                    ? await source[m.key].findMany({
                          take: PAGE,
                          orderBy: { [m.idField]: 'asc' },
                          ...(cursor ? { cursor: { [m.idField]: cursor }, skip: 1 } : {}),
                      })
                    : await source[m.key].findMany({ take: PAGE, skip: copied });

                if (page.length === 0) break;

                // A dry run still READS every page, so the pagination, the cursor
                // and the row shapes are all exercised — it just never writes.
                if (!dryRun) {
                    for (let i = 0; i < page.length; i += BATCH) {
                        await dest[m.key].createMany({ data: page.slice(i, i + BATCH) });
                    }
                }

                copied += page.length;
                if (m.idField) cursor = page[page.length - 1][m.idField];
                if (page.length < PAGE) break;
            }

            report.push({ model: m.name, table: m.table, rows: copied });
            onProgress?.({
                phase: 'copy',
                model: m.name,
                rows: copied,
                message: `${m.table}: ${copied} rows${dryRun ? ' (would copy)' : ''}`,
            });
        }
    } finally {
        await source.$disconnect();
        await dest.$disconnect();
    }

    return report;
}
