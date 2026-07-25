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
 *   4. purgeDueAccounts() (cron) deletes permanently once the grace period ends.
 *
 * Both stores permit scheduled/asynchronous deletion, provided the user is told
 * when it completes — which is why the API returns the exact date and the UI
 * shows it.
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
 * Purge every account whose grace period has elapsed. Called by the cron route.
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
