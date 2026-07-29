import { NextResponse } from 'next/server';
import { sweepExpiredConsultations } from '@/lib/consultations/session';

/**
 * Closes consultations whose paid time ran out without an extension.
 *
 * **Deliberately not registered in vercel.json.** The Vercel plan in use permits
 * only daily cron schedules, and adding a more frequent one fails the build. A
 * once-a-day sweep would be a poor safety net anyway, so nothing depends on this
 * running: `startConsultation` closes the caller's own stale sessions, and the
 * messages route closes a session the moment it finds one past its deadline.
 *
 * Kept because it is still useful — a manual tidy-up, or a hook for an external
 * scheduler (GitHub Actions, cron-job.org) if one is ever wanted.
 *
 * Authenticated with CRON_SECRET, matching /api/cron/purge-accounts. Without it
 * anyone could force-close live consultations, which is a denial-of-service
 * against paying users.
 */

export const maxDuration = 60;

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
        // Fail closed, as the purge cron does.
        console.error('CRON_SECRET is not configured; refusing to sweep.');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { closed } = await sweepExpiredConsultations();
        if (closed > 0) {
            console.log(`[cron] swept ${closed} expired consultation(s)`);
        }
        return NextResponse.json({ ok: true, closed });
    } catch (error) {
        console.error('[cron] consultation sweep failed:', error);
        return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
    }
}
