import { NextRequest, NextResponse } from 'next/server';
import { purgeDueAccounts } from '@/lib/accountDeletion';

/**
 * Permanently deletes accounts whose deletion grace period has elapsed.
 *
 * Scheduled by the `crons` entry in vercel.json. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`, which is checked below — without that
 * check this endpoint would let anyone on the internet trigger account purges.
 *
 * Also callable manually with the same header, to verify the flow end to end.
 */

// Purging touches many cascading deletes; give it room beyond the default.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
        // Fail closed. An unauthenticated purge endpoint is far worse than a
        // purge that doesn't run.
        console.error('CRON_SECRET is not configured; refusing to purge.');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await purgeDueAccounts();

        if (result.purged > 0 || result.failed > 0) {
            console.info(
                `Account purge: ${result.purged} deleted, ${result.failed} failed, ${result.due} due.`
            );
        }

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Account purge cron error:', error);
        return NextResponse.json({ error: 'Purge failed' }, { status: 500 });
    }
}
