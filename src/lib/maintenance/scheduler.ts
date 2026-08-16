import prisma from '@/lib/prisma';

/**
 * Scheduled work, without a scheduler.
 *
 * `392c147` removed the `crons` block from vercel.json for free-tier
 * compatibility, and every job it drove has been dead since: accounts marked
 * for deletion were never purged, appointment reminders were never sent, and
 * requests nobody answered never expired. Vercel's Hobby plan only permits a
 * DAILY cron in any case, which cannot deliver a one-hour reminder — so even
 * restoring the block would not have fixed the reminders.
 *
 * So the trigger is ordinary traffic. Every page view already posts to
 * /api/analytics/track, which hands work to `after()`; this rides along there,
 * behind a claim so that N concurrent requests do not all run the same job.
 *
 * Two things make this safe rather than a hack:
 *
 *   - Every job here is idempotent. Purging skips accounts already gone;
 *     reminders set their sent-flags in the same update that selects the rows;
 *     the consultation sweep only closes what has already expired. Running one
 *     twice costs a query, not a duplicate side effect.
 *   - The claim is a single conditional UPDATE, so exactly one caller wins a
 *     given window. Reading a timestamp and then writing it would let two
 *     instances both pass the check.
 *
 * The cron routes still exist and still work. If a scheduler is ever pointed at
 * them — Supabase pg_cron, cron-job.org, a GitHub Action, or Vercel on a paid
 * plan — nothing here has to change, and the double-run is harmless for the
 * reasons above.
 *
 * NOT included: /api/cron/whatsapp-daily. It has no per-user dedup, so it sends
 * to every opted-in user on every invocation, and it currently sends Meta's
 * `hello_world` placeholder template rather than a real daily message. Wiring
 * it to traffic would start blasting meaningless paid messages at people who
 * are not receiving anything today. It needs an approved template and a sent-log
 * before it runs from anywhere.
 */

/** Minute-resolution epoch: AppSetting.value is an Int, and seconds overflow
 *  Int32 in 2038. Minutes hold until roughly the year 6000. */
const nowMinute = () => Math.floor(Date.now() / 60_000);

/** Per-instance gate per job, so the common case costs no query at all. */
const lastLocalRun = new Map<string, number>();

/**
 * Try to claim a window for `key`. True means this caller owns it and should do
 * the work; false means somebody else has it, or it is not due yet.
 *
 * Never throws — a failed claim must not turn a page view into an error.
 */
export async function claimWindow(key: string, intervalMinutes: number): Promise<boolean> {
    const minute = nowMinute();

    const local = lastLocalRun.get(key) ?? 0;
    if (minute - local < intervalMinutes) return false;
    lastLocalRun.set(key, minute);

    try {
        // One statement: the WHERE and the SET are evaluated together, so
        // exactly one of N concurrent instances sees a count of 1.
        const claimed = await prisma.appSetting.updateMany({
            where: { key, value: { lt: minute - intervalMinutes } },
            data: { value: minute },
        });

        if (claimed.count > 0) return true;

        // Either another instance holds this window, or the row has never
        // existed. Creating it counts as claiming it; a unique violation means
        // somebody else created it first, which is also a loss.
        try {
            await prisma.appSetting.create({
                data: {
                    key,
                    value: minute,
                    description: 'Epoch minute of the last traffic-driven run of this job.',
                },
            });
            return true;
        } catch {
            return false;
        }
    } catch (error) {
        console.error(`Could not claim maintenance window ${key}:`, error);
        return false;
    }
}

interface Job {
    key: string;
    intervalMinutes: number;
    run: () => Promise<unknown>;
}

/**
 * How often each job may run.
 *
 * Hourly for all three. The reminder windows are 26 hours and 90 minutes wide
 * precisely so that a scheduler running late does not miss one, so hourly has
 * plenty of margin; and the difference between purging an account at 14:00 and
 * at 14:59 is nothing against a seven-day grace period.
 */
function jobs(): Job[] {
    return [
        {
            key: 'LAST_DELETION_SWEEP',
            intervalMinutes: 60,
            run: async () => {
                const { purgeDueAccounts } = await import('@/lib/accountDeletion');
                return purgeDueAccounts(20);
            },
        },
        {
            key: 'LAST_APPOINTMENT_REMINDERS',
            intervalMinutes: 60,
            run: async () => {
                const { runAppointmentReminders } = await import('./appointmentReminders');
                return runAppointmentReminders();
            },
        },
        {
            key: 'LAST_CONSULTATION_SWEEP',
            intervalMinutes: 60,
            run: async () => {
                const { sweepExpiredConsultations } = await import('@/lib/consultations/session');
                return sweepExpiredConsultations();
            },
        },
    ];
}

/**
 * Run whatever is due, claimed independently per job.
 *
 * Independent rather than one shared window, so a slow job cannot starve the
 * others and a job that throws cannot stop the rest. Dynamic imports so a page
 * view that claims nothing — the overwhelming majority — never loads the mail
 * client, the push SDK or the consultation module at all.
 *
 * Never throws.
 */
export async function runDueMaintenance(): Promise<void> {
    for (const job of jobs()) {
        try {
            if (!(await claimWindow(job.key, job.intervalMinutes))) continue;
            await job.run();
        } catch (error) {
            console.error(`Maintenance job ${job.key} failed:`, error);
        }
    }
}
