import prisma from '@/lib/prisma';

/**
 * Account deletion with a grace period.
 *
 * Required in-app by App Store guideline 5.1.1(v) and by Google Play's data
 * deletion policy, so this gates both store submissions. It also services the
 * erasure right under India's DPDP Act and GDPR.
 *
 * Shape of the flow:
 *   1. requestAccountDeletion() marks the account and schedules the purge.
 *   2. The client signs out immediately.
 *   3. Signing back in reaches ONLY the cancellation screen — see
 *      PendingDeletionGate. This is the part that matters for review: both stores
 *      reject an "account deletion" that leaves the account fully usable, because
 *      that is deactivation.
 *   4. purgeDueAccounts() deletes permanently once the grace period ends.
 *
 * Both stores permit scheduled/asynchronous deletion, provided the user is told
 * when it completes — which is why the API returns the exact date and the UI
 * shows it.
 *
 * Step 4 used to run ONLY from /api/cron/purge-accounts, and `392c147` removed
 * the crons block from vercel.json. Nothing has invoked that route since, so
 * every account requested for deletion has been marked, locked, promised a date
 * — and then kept. That is the exact failure both store policies are written to
 * catch, and it is invisible from the outside because the user-facing half of
 * the flow works perfectly.
 *
 * So the sweep no longer depends on a scheduler existing. maybePurgeDueAccounts()
 * below is driven by ordinary traffic, the way the lifecycle mail engine already
 * is. The cron route still works and is still the better trigger if the Vercel
 * plan is ever configured for it; it is now a convenience rather than the only
 * thing standing between a promise and keeping it.
 */

/**
 * Grace period length.
 *
 * Deliberately shorter than the 30 days Google and Meta use. It is long enough
 * to undo a mistake but short enough that a store reviewer checking back does
 * not find a "deleted" account still alive weeks later.
 */
export const DELETION_GRACE_DAYS = 7;

export interface DeletionStatus {
    pending: boolean;
    requestedAt: string | null;
    /** ISO timestamp of permanent deletion. */
    scheduledFor: string | null;
    graceDays: number;
}

export async function getDeletionStatus(userId: string): Promise<DeletionStatus | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { deletionRequestedAt: true, deletionScheduledFor: true },
    });

    if (!user) return null;

    return {
        pending: !!user.deletionRequestedAt,
        requestedAt: user.deletionRequestedAt?.toISOString() ?? null,
        scheduledFor: user.deletionScheduledFor?.toISOString() ?? null,
        graceDays: DELETION_GRACE_DAYS,
    };
}

/**
 * Schedule deletion. Idempotent: re-requesting does not extend the deadline,
 * so a user cannot accidentally keep pushing the date back.
 */
export async function requestAccountDeletion(userId: string): Promise<DeletionStatus> {
    const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { deletionRequestedAt: true, deletionScheduledFor: true },
    });

    if (existing?.deletionRequestedAt && existing.deletionScheduledFor) {
        return {
            pending: true,
            requestedAt: existing.deletionRequestedAt.toISOString(),
            scheduledFor: existing.deletionScheduledFor.toISOString(),
            graceDays: DELETION_GRACE_DAYS,
        };
    }

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                deletionRequestedAt: now,
                deletionScheduledFor: scheduledFor,
                // Stop all outbound marketing immediately. Continuing to email
                // someone who asked to be deleted is its own compliance problem.
                isSubscribed: false,
            },
        }),
        // Retire push tokens now, not at purge time — the user should stop
        // hearing from us the moment they ask to leave.
        prisma.deviceToken.updateMany({
            where: { userId, disabledAt: null },
            data: { disabledAt: now },
        }),
        // Invalidate any database sessions. The JWT strategy means the current
        // token stays technically valid until it expires, which is why
        // PendingDeletionGate enforces the lock on every request instead of
        // relying on session revocation alone.
        prisma.session.deleteMany({ where: { userId } }),
    ]);

    return {
        pending: true,
        requestedAt: now.toISOString(),
        scheduledFor: scheduledFor.toISOString(),
        graceDays: DELETION_GRACE_DAYS,
    };
}

/** Undo a pending deletion. Only reachable while still inside the grace period. */
export async function cancelAccountDeletion(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { deletionRequestedAt: true },
    });

    if (!user?.deletionRequestedAt) return false;

    await prisma.user.update({
        where: { id: userId },
        data: { deletionRequestedAt: null, deletionScheduledFor: null },
    });

    // isSubscribed is deliberately NOT restored. Re-enabling marketing without
    // asking would be presumptuous; the user can opt back in from settings.
    return true;
}

/**
 * Permanently delete one account and everything belonging to it.
 *
 * Relies on the `onDelete: Cascade` relations already declared on User in
 * schema.prisma (profiles, questions, creditPacks, journalEntries, accounts,
 * sessions, exports, creditHistory, creditRequests, topics, posts,
 * profileLimits, lifecycleEmails, deviceTokens).
 *
 * NewsletterSubscriber is a separate table keyed by email with no FK to User, so
 * it is cleaned up explicitly — otherwise a deleted user keeps receiving the
 * newsletter, which is exactly the complaint that deletion is meant to resolve.
 */
export async function purgeAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    if (!user) return;

    await prisma.$transaction([
        prisma.newsletterSubscriber.deleteMany({
            where: { email: { equals: user.email, mode: 'insensitive' } },
        }),
        prisma.user.delete({ where: { id: userId } }),
    ]);
}

export interface PurgeResult {
    due: number;
    purged: number;
    failed: number;
}

/**
 * Purge every account whose grace period has elapsed.
 *
 * Failures are per-account so one bad row cannot block the rest of the queue.
 */
export async function purgeDueAccounts(limit = 100): Promise<PurgeResult> {
    const due = await prisma.user.findMany({
        where: { deletionScheduledFor: { lte: new Date() } },
        select: { id: true },
        take: limit,
    });

    let purged = 0;
    let failed = 0;

    for (const { id } of due) {
        try {
            await purgeAccount(id);
            purged += 1;
        } catch (error) {
            failed += 1;
            console.error(`Failed to purge account ${id}:`, error);
        }
    }

    return { due: due.length, purged, failed };
}

/**
 * How often ordinary traffic may trigger a sweep.
 *
 * Hourly, not per-request: the grace period is seven days, so the difference
 * between purging at 14:00 and at 14:59 is nothing, while the difference
 * between one query an hour and one per page view is the whole cost.
 */
const SWEEP_INTERVAL_MINUTES = 60;

/** The row that IS the lock. */
const SWEEP_KEY = 'LAST_DELETION_SWEEP';

/**
 * Deliberately small. This runs behind a page view, not in a batch window, and
 * a backlog drains over the following hours rather than in one long transaction
 * attached to somebody's navigation.
 */
const TRAFFIC_SWEEP_LIMIT = 20;

/**
 * Minute-resolution epoch, because AppSetting.value is an Int. Seconds would
 * overflow Int32 in 2038; minutes hold until roughly the year 6000.
 */
const nowMinute = () => Math.floor(Date.now() / 60_000);

/** Per-instance gate, so the common case costs no query at all. */
let lastLocalSweepMinute = 0;

/**
 * Purge due accounts, at most once an hour across the whole deployment.
 *
 * Called from the analytics route via `after()`, alongside the lifecycle mail
 * engine that already works this way. Traffic is the trigger because the user
 * who asked to be deleted is precisely the one who never comes back — a
 * self-heal on their own next request, which is how expired consultations are
 * handled, would never fire for them.
 *
 * Never throws. A failed sweep must not turn a page view into an error.
 */
export async function maybePurgeDueAccounts(): Promise<PurgeResult | null> {
    const minute = nowMinute();

    if (minute - lastLocalSweepMinute < SWEEP_INTERVAL_MINUTES) return null;
    lastLocalSweepMinute = minute;

    try {
        // One statement, so exactly one of N concurrent instances sees a count
        // of 1. Reading the row and then writing it would let two instances
        // both pass the check and both sweep.
        const claimed = await prisma.appSetting.updateMany({
            where: { key: SWEEP_KEY, value: { lt: minute - SWEEP_INTERVAL_MINUTES } },
            data: { value: minute },
        });

        if (claimed.count === 0) {
            // Either another instance holds this hour, or the row has never
            // existed. Creating it counts as claiming it; a unique violation
            // means somebody else created it first, which is also a loss.
            try {
                await prisma.appSetting.create({
                    data: {
                        key: SWEEP_KEY,
                        value: minute,
                        description: 'Epoch minute of the last traffic-driven account purge.',
                    },
                });
            } catch {
                return null;
            }
        }

        return await purgeDueAccounts(TRAFFIC_SWEEP_LIMIT);
    } catch (error) {
        console.error('Traffic-driven account purge failed:', error);
        return null;
    }
}
