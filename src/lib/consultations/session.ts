import { after } from 'next/server';
import prisma from '@/lib/prisma';
import { spendCredits, getBalance } from './credits';
import {
    getSettings,
    secondsPerCredit,
    earningsPaise,
    type ConsultationKind,
} from './settings';

/**
 * Consultation session lifecycle.
 *
 * Sessions are billed in whole blocks. One credit opens one block; continuing
 * past it requires an explicit extension that buys another. Nothing is
 * fractional, which is what lets the existing whole-credit pack model stand
 * without migration.
 *
 * The server owns the deadline. The client counts down toward `deadlineAt` for
 * display, but every decision — may this session continue, has it expired, who
 * is charged — is made here against server time. Clocks drift, apps get
 * suspended, and networks stall; none of that may translate into free or
 * double-billed minutes.
 *
 * Termination is likewise a server action. `endConsultation` and the sweeper
 * close the record and settle earnings whether or not a client cooperates. A
 * client that never sends an end event must not be able to hold a session open.
 */

export type StartResult =
    | { ok: true; consultationId: string; deadlineAt: Date; secondsPerBlock: number }
    | { ok: false; reason: 'INSUFFICIENT_CREDITS'; available: number }
    | { ok: false; reason: 'ASTROLOGER_UNAVAILABLE' }
    | { ok: false; reason: 'ALREADY_IN_SESSION'; consultationId: string };

/** Statuses that mean a session is still running. */
export const LIVE_STATUSES = ['REQUESTED', 'ACTIVE'] as const;

export async function startConsultation(
    userId: string,
    astrologerId: string,
    kind: ConsultationKind = 'CHAT'
): Promise<StartResult> {
    const settings = await getSettings();
    const blockSeconds = secondsPerCredit(kind, settings);

    const astrologer = await prisma.astrologer.findUnique({
        where: { id: astrologerId },
        select: {
            id: true,
            status: true,
            isAvailable: true,
            revenueSharePct: true,
            creditsPerBlock: true,
            isAI: true,
        },
    });

    // An AI persona is never "away", so the presence requirement does not apply
    // to it — there is no browser holding it online and no heartbeat to go
    // stale. Approval still does: an AI astrologer that has not been approved
    // must no more take sessions than a human one.
    const available = astrologer?.isAI ? true : astrologer?.isAvailable;
    if (!astrologer || astrologer.status !== 'APPROVED' || !available) {
        return { ok: false, reason: 'ASTROLOGER_UNAVAILABLE' };
    }

    // Per-astrologer rate, falling back to the historical 1-credit block.
    // Guarded against a zero or negative override making sessions free.
    const creditsPerBlock = Math.max(1, astrologer.creditsPerBlock ?? 1);

    // Self-heal before the one-session check.
    //
    // Correctness here must not depend on a cron. The Vercel plan in use allows
    // only daily schedules, so a session abandoned by a crashed app would stay
    // "live" for up to a day — and its owner would be locked out of starting a
    // new one that whole time, having already paid for the first.
    //
    // Closing the caller's own expired sessions at the moment it matters makes
    // the sweep a convenience rather than a dependency.
    await closeExpiredForUser(userId);

    // One live session per user. Without this a user could open several at once
    // and occupy multiple astrologers, and the credit spends would interleave.
    const existing = await prisma.consultation.findFirst({
        where: { userId, status: { in: [...LIVE_STATUSES] } },
        select: { id: true },
    });
    if (existing) {
        return { ok: false, reason: 'ALREADY_IN_SESSION', consultationId: existing.id };
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const spend = await spendCredits(
                tx,
                userId,
                creditsPerBlock,
                `Consultation (${kind.toLowerCase()}) — first block`
            );
            if (!spend.ok) {
                return {
                    ok: false as const,
                    reason: 'INSUFFICIENT_CREDITS' as const,
                    available: spend.available,
                };
            }

            const now = new Date();
            const consultation = await tx.consultation.create({
                data: {
                    userId,
                    astrologerId,
                    kind,
                    status: 'ACTIVE',
                    startedAt: now,
                    deadlineAt: new Date(now.getTime() + blockSeconds * 1000),
                    blocksCharged: 1,
                    creditsCharged: creditsPerBlock,
                    // Snapshots. Never joined live — see the model comment.
                    secondsPerBlock: blockSeconds,
                    creditValuePaise: settings.CREDIT_VALUE_PAISE,
                    revenueSharePct:
                        astrologer.revenueSharePct ?? settings.ASTROLOGER_REVENUE_PCT,
                    creditsPerBlock,
                },
                select: { id: true, deadlineAt: true },
            });

            return {
                ok: true as const,
                consultationId: consultation.id,
                deadlineAt: consultation.deadlineAt!,
                secondsPerBlock: blockSeconds,
            };
        });
    } catch (error) {
        // A unique-violation on the one-live-session guard would land here if two
        // start requests raced past the pre-check above.
        console.error('[consultation] start failed:', error);
        throw error;
    }
}

export type ExtendResult =
    | { ok: true; deadlineAt: Date; creditsCharged: number }
    | { ok: false; reason: 'INSUFFICIENT_CREDITS'; available: number }
    | { ok: false; reason: 'NOT_ACTIVE' }
    | { ok: false; reason: 'EXPIRED' };

/**
 * Buys one more block.
 *
 * The client offers the prompt; this decides. A client cannot extend itself, and
 * cannot extend a session whose deadline has already passed — that has to end
 * and start again, otherwise a user could reconnect an hour later and resume a
 * slot the astrologer has long since given up.
 */
export async function extendConsultation(
    consultationId: string,
    userId: string
): Promise<ExtendResult> {
    return prisma.$transaction(async (tx) => {
        const consultation = await tx.consultation.findFirst({
            where: { id: consultationId, userId },
            select: {
                id: true,
                status: true,
                deadlineAt: true,
                secondsPerBlock: true,
                kind: true,
                creditsCharged: true,
                creditsPerBlock: true,
            },
        });

        if (!consultation || consultation.status !== 'ACTIVE') {
            return { ok: false as const, reason: 'NOT_ACTIVE' as const };
        }
        if (!consultation.deadlineAt || consultation.deadlineAt.getTime() <= Date.now()) {
            return { ok: false as const, reason: 'EXPIRED' as const };
        }

        // The rate SNAPSHOTTED when this session opened, not the astrologer's
        // current one. Re-reading it live would let a repricing mid-session
        // change what the user is charged for the block they are already in.
        const creditsPerBlock = Math.max(1, consultation.creditsPerBlock);

        const spend = await spendCredits(
            tx,
            userId,
            creditsPerBlock,
            `Consultation (${consultation.kind.toLowerCase()}) — extension`,
            { consultationId }
        );
        if (!spend.ok) {
            return {
                ok: false as const,
                reason: 'INSUFFICIENT_CREDITS' as const,
                available: spend.available,
            };
        }

        // Extend from the existing deadline, not from now. Extending from `now`
        // would quietly discard whatever time is left in the current block, so a
        // user who extends early would lose the seconds they already paid for.
        const nextDeadline = new Date(
            consultation.deadlineAt.getTime() + consultation.secondsPerBlock * 1000
        );

        const updated = await tx.consultation.update({
            where: { id: consultationId },
            data: {
                deadlineAt: nextDeadline,
                blocksCharged: { increment: 1 },
                creditsCharged: { increment: creditsPerBlock },
            },
            select: { deadlineAt: true, creditsCharged: true },
        });

        return {
            ok: true as const,
            deadlineAt: updated.deadlineAt!,
            creditsCharged: updated.creditsCharged,
        };
    });
}

export type EndReason =
    | 'ENDED_BY_USER'
    | 'ENDED_BY_ASTROLOGER'
    | 'ENDED_NO_EXTENSION'
    | 'ENDED_TIMEOUT'
    | 'FAILED';

/**
 * Closes a session and writes the astrologer's earning.
 *
 * Idempotent: a session already ended is returned untouched rather than settled
 * twice. Both parties plus the sweeper can race to end the same session, and the
 * unique constraint on AstrologerEarning.consultationId is the backstop if they
 * somehow get past this check together.
 */
export async function endConsultation(
    consultationId: string,
    reason: EndReason
): Promise<{ ended: boolean; creditsCharged: number; earningsPaise: number }> {
    const result = await settleConsultation(consultationId, reason);

    // Rewrite what this astrologer remembers about this seeker.
    //
    // AFTER the transaction and outside it, deliberately. It calls a model, so
    // holding a database transaction open for it would park a pooled connection
    // on network latency — and this runs on the request that ends a session,
    // which has already taken the money and written the earning. A memory that
    // fails to update is a worse memory; a transaction that fails here would
    // roll back a settlement.
    //
    // Only when a session actually ended: endConsultation is idempotent, and a
    // second caller racing to close the same session must not spend a second
    // model call rewriting the same notes.
    if (result.ended) {
        after(async () => {
            const { rewriteConsultationMemory } = await import('./memory');
            await rewriteConsultationMemory(consultationId);
        });
    }

    return result;
}

/** The settlement itself — one transaction, no I/O beyond the database. */
async function settleConsultation(
    consultationId: string,
    reason: EndReason
): Promise<{ ended: boolean; creditsCharged: number; earningsPaise: number }> {
    return prisma.$transaction(async (tx) => {
        const consultation = await tx.consultation.findUnique({
            where: { id: consultationId },
            select: {
                id: true,
                status: true,
                startedAt: true,
                astrologerId: true,
                creditsCharged: true,
                creditValuePaise: true,
                revenueSharePct: true,
                astrologer: { select: { isAI: true } },
            },
        });

        if (!consultation) return { ended: false, creditsCharged: 0, earningsPaise: 0 };

        const alreadyEnded = !(LIVE_STATUSES as readonly string[]).includes(
            consultation.status
        );
        if (alreadyEnded) {
            const existing = await tx.astrologerEarning.findUnique({
                where: { consultationId },
                select: { amountPaise: true },
            });
            return {
                ended: false,
                creditsCharged: consultation.creditsCharged,
                earningsPaise: existing?.amountPaise ?? 0,
            };
        }

        const endedAt = new Date();
        const billedSeconds = consultation.startedAt
            ? Math.max(
                  0,
                  Math.round((endedAt.getTime() - consultation.startedAt.getTime()) / 1000)
              )
            : 0;

        await tx.consultation.update({
            where: { id: consultationId },
            data: { status: reason, endedAt, billedSeconds },
        });

        // Zero for an AI persona, so the reported figure matches the ledger
        // rather than describing an earning that was deliberately not written.
        const amount = consultation.astrologer.isAI
            ? 0
            : earningsPaise(
                  consultation.creditsCharged,
                  consultation.creditValuePaise,
                  consultation.revenueSharePct
              );

        // Only settle if something was actually charged. A session that failed
        // before any block opened owes nobody anything.
        //
        // An AI persona is never settled either: there is no person behind it,
        // so an earning row would accrue a real payout obligation to nobody and
        // inflate the payout run. The revenue is the platform's.
        if (consultation.creditsCharged > 0 && !consultation.astrologer.isAI) {
            await tx.astrologerEarning.create({
                data: {
                    astrologerId: consultation.astrologerId,
                    consultationId,
                    creditsServed: consultation.creditsCharged,
                    amountPaise: amount,
                },
            });
        }

        return {
            ended: true,
            creditsCharged: consultation.creditsCharged,
            earningsPaise: amount,
        };
    });
}

/**
 * Closes one user's own expired sessions.
 *
 * Called on the path where a stale session actually hurts — starting a new one.
 * Scoped to a single user so it stays a cheap indexed lookup rather than a scan.
 */
export async function closeExpiredForUser(userId: string): Promise<number> {
    const settings = await getSettings();
    const cutoff = new Date(Date.now() - settings.SESSION_GRACE_SECONDS * 1000);

    const stale = await prisma.consultation.findMany({
        where: {
            userId,
            status: { in: [...LIVE_STATUSES] },
            deadlineAt: { lt: cutoff },
        },
        select: { id: true },
    });

    let closed = 0;
    for (const { id } of stale) {
        try {
            const result = await endConsultation(id, 'ENDED_NO_EXTENSION');
            if (result.ended) closed += 1;
        } catch (error) {
            console.error(`[consultation] self-heal failed for ${id}:`, error);
        }
    }
    return closed;
}

/**
 * Closes every expired session, across all users.
 *
 * Not wired to a Vercel cron: the plan in use permits only daily schedules, and
 * a once-a-day sweep is not a safety net worth relying on. The paths that matter
 * heal themselves instead — `closeExpiredForUser` on session start, and the
 * messages route closing a session the moment it finds one past its deadline.
 *
 * This remains callable at /api/cron/sweep-consultations for a manual tidy-up,
 * or from an external scheduler (GitHub Actions, cron-job.org) if one is ever
 * wanted. Nothing depends on it running.
 */
export async function sweepExpiredConsultations(): Promise<{ closed: number }> {
    const settings = await getSettings();
    const cutoff = new Date(Date.now() - settings.SESSION_GRACE_SECONDS * 1000);

    const expired = await prisma.consultation.findMany({
        where: { status: { in: [...LIVE_STATUSES] }, deadlineAt: { lt: cutoff } },
        select: { id: true },
        take: 200,
    });

    let closed = 0;
    for (const { id } of expired) {
        try {
            const result = await endConsultation(id, 'ENDED_NO_EXTENSION');
            if (result.ended) closed += 1;
        } catch (error) {
            // One bad row must not stop the sweep.
            console.error(`[consultation] sweep failed for ${id}:`, error);
        }
    }

    return { closed };
}

/** Remaining seconds by server clock. Negative means already past due. */
export function remainingSeconds(deadlineAt: Date | null): number {
    if (!deadlineAt) return 0;
    return Math.round((deadlineAt.getTime() - Date.now()) / 1000);
}

export { getBalance };
