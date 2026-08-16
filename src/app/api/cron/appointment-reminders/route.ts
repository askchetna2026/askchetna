import { NextResponse } from 'next/server';
import { runAppointmentReminders } from '@/lib/maintenance/appointmentReminders';

/**
 * Sends the 24-hour and 1-hour reminders for confirmed appointments, and
 * expires requests nobody answered.
 *
 * Scheduler-agnostic on purpose. Vercel's Hobby plan only permits DAILY cron,
 * which cannot deliver a one-hour reminder, so this is a plain authenticated
 * endpoint that any scheduler can drive — Supabase pg_cron, cron-job.org,
 * Cloudflare, a GitHub Action. Nothing here assumes a particular caller or a
 * particular interval; it looks at the clock and sends what is due.
 *
 * That was true and yet nothing drove it: `392c147` removed the crons block and
 * this endpoint has not been called since. The work now also runs from ordinary
 * traffic (src/lib/maintenance/scheduler.ts), so reminders go out whether or not
 * a scheduler exists. The route stays because an external scheduler is still the
 * better trigger, and calling both is harmless — the sent-flags are set in the
 * same update that selects the rows, so two callers cannot send the same notice
 * twice.
 *
 * The logic lives in the lib module rather than here because a route module may
 * only export handlers; anything else fails the build.
 */

export const maxDuration = 60;

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error('CRON_SECRET is not configured; refusing to run.');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runAppointmentReminders();

    return NextResponse.json({ ok: true, ...result });
}
