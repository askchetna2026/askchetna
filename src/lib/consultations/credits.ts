import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Credit spending for consultations.
 *
 * Mirrors the pack-based deduction already used by /api/clarity/ask — oldest
 * pack first, balance derived from Σ(questionsTotal − questionsUsed) — but adds
 * a row lock, because the consultation case is materially more exposed to
 * concurrency than asking a question is.
 *
 * A user can have the app open on two devices, or tap "extend" twice while the
 * first request is still in flight. The existing pattern reads the packs, checks
 * the total, then writes; inside a transaction that is still read-then-write
 * without a lock, so two overlapping transactions can both observe the same
 * balance and both spend it. For a question that costs someone one extra credit.
 * For sessions it also pays an astrologer twice, which reaches the payout ledger.
 *
 * SELECT ... FOR UPDATE serialises them: the second transaction blocks until the
 * first commits, then re-reads the real remaining balance and correctly fails.
 */

export type SpendResult =
    | { ok: true; remaining: number }
    | { ok: false; reason: 'INSUFFICIENT_CREDITS'; available: number };

/** Balance without locking. For display only — never decide a spend on this. */
export async function getBalance(tx: Tx, userId: string): Promise<number> {
    const packs = await tx.creditPack.findMany({
        where: { userId },
        select: { questionsTotal: true, questionsUsed: true },
    });
    return packs.reduce(
        (sum, p) => sum + Math.max(0, p.questionsTotal - p.questionsUsed),
        0
    );
}

/**
 * Spends `credits`, oldest pack first. MUST be called inside a transaction —
 * the lock it takes is only held for the life of one.
 */
export async function spendCredits(
    tx: Prisma.TransactionClient,
    userId: string,
    credits: number,
    description: string,
    metadata?: Prisma.InputJsonValue
): Promise<SpendResult> {
    if (credits <= 0) throw new Error('spendCredits: credits must be positive');

    // Lock this user's packs. Ordered by purchase date so concurrent
    // transactions take the rows in the same sequence and cannot deadlock.
    const locked = await tx.$queryRaw<
        Array<{ id: string; questionsTotal: number; questionsUsed: number }>
    >`
        SELECT id, "questionsTotal", "questionsUsed"
        FROM "CreditPack"
        WHERE "userId" = ${userId}
          AND "questionsUsed" < "questionsTotal"
        ORDER BY "purchasedAt" ASC
        FOR UPDATE
    `;

    const available = locked.reduce(
        (sum, p) => sum + (p.questionsTotal - p.questionsUsed),
        0
    );
    if (available < credits) {
        return { ok: false, reason: 'INSUFFICIENT_CREDITS', available };
    }

    let outstanding = credits;
    for (const pack of locked) {
        if (outstanding <= 0) break;
        const take = Math.min(pack.questionsTotal - pack.questionsUsed, outstanding);
        await tx.creditPack.update({
            where: { id: pack.id },
            data: { questionsUsed: { increment: take } },
        });
        outstanding -= take;
    }

    // The signed ledger the rest of the app reads for history. Kept in step with
    // the pack write inside the same transaction so the two representations can
    // never disagree.
    await tx.creditTransaction.create({
        data: {
            userId,
            amount: -credits,
            description,
            ...(metadata !== undefined ? { metadata } : {}),
        },
    });

    return { ok: true, remaining: available - credits };
}

/**
 * Returns credits to the user by opening a compensating pack.
 *
 * Deliberately does NOT decrement `questionsUsed` on the original packs: those
 * rows are the record of what was consumed, and rewriting them backwards loses
 * the fact that a refund happened. A small never-expiring pack plus a positive
 * ledger entry keeps the history readable.
 */
export async function refundCredits(
    tx: Prisma.TransactionClient,
    userId: string,
    credits: number,
    description: string,
    metadata?: Prisma.InputJsonValue
): Promise<void> {
    if (credits <= 0) return;

    await tx.creditPack.create({
        data: {
            userId,
            packType: 'REFUND',
            questionsTotal: credits,
            questionsUsed: 0,
            paymentId: 'refund',
            amount: 0,
        },
    });

    await tx.creditTransaction.create({
        data: {
            userId,
            amount: credits,
            description,
            ...(metadata !== undefined ? { metadata } : {}),
        },
    });
}
