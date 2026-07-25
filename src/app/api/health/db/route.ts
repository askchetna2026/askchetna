import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Reports WHICH database this deployment is actually connected to, and whether
 * its schema is current.
 *
 * Exists because a schema mismatch between a deployment and its database is
 * nearly invisible from outside: Prisma throws P2022, NextAuth swallows it into
 * the generic `error=Configuration`, and the login page shows nothing useful. The
 * only way to tell had been to guess which DATABASE_URL an environment holds and
 * check that one locally — which is easy to get wrong when several Supabase
 * projects share the same pooler hostname and differ only in the username.
 *
 * Requires the CRON_SECRET bearer token. It exposes infrastructure detail
 * (hostname, database user, migration history) that is useful to an attacker
 * mapping the system, and it must never be publicly readable. The password is
 * never included.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/health/db
 */

export const dynamic = 'force-dynamic';

/** Columns added by the mobile work — the ones a stale database will be missing. */
const EXPECTED_USER_COLUMNS = ['phone', 'phoneVerifiedAt', 'deletionRequestedAt', 'deletionScheduledFor'];
const EXPECTED_TABLES = ['DeviceToken', 'NewsletterSubscriber', 'LifecycleEmail'];

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
    }
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Identify the target WITHOUT ever revealing the password. For Supabase the
    // project ref is encoded in the username (postgres.<ref>), which is the part
    // that actually distinguishes one project from another — the pooler hostname
    // is shared and identical across projects, which is precisely what made this
    // confusing.
    let target: Record<string, string | null> = { raw: 'DATABASE_URL not set' };
    try {
        const url = new URL(process.env.DATABASE_URL ?? '');
        target = {
            host: url.hostname,
            port: url.port || null,
            database: url.pathname.replace(/^\//, '') || null,
            user: decodeURIComponent(url.username),
            supabaseProjectRef: url.username.includes('.')
                ? decodeURIComponent(url.username).split('.').slice(1).join('.')
                : null,
        };
    } catch {
        /* leave the placeholder */
    }

    const result: Record<string, unknown> = { target };

    try {
        const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'User'
        `;
        const present = new Set(columns.map((c) => c.column_name));
        result.userColumns = {
            missing: EXPECTED_USER_COLUMNS.filter((c) => !present.has(c)),
            ok: EXPECTED_USER_COLUMNS.every((c) => present.has(c)),
        };

        const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
        `;
        const tableNames = new Set(tables.map((t) => t.table_name));
        result.tables = {
            missing: EXPECTED_TABLES.filter((t) => !tableNames.has(t)),
            ok: EXPECTED_TABLES.every((t) => tableNames.has(t)),
        };

        const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
            SELECT migration_name, finished_at FROM _prisma_migrations
            ORDER BY finished_at DESC NULLS LAST LIMIT 3
        `;
        result.migrations = {
            latest: migrations.map((m) => m.migration_name),
        };

        const userColumns = result.userColumns as { ok: boolean };
        const tablesResult = result.tables as { ok: boolean };
        result.healthy = userColumns.ok && tablesResult.ok;
    } catch (error) {
        result.healthy = false;
        result.error = error instanceof Error ? error.message.split('\n').filter(Boolean).slice(-1)[0] : String(error);
    }

    return NextResponse.json(result, { status: result.healthy ? 200 : 503 });
}
