import prisma from '@/lib/prisma';

/**
 * Payout runs.
 *
 * A run claims every unpaid earning up to a cut-off date and groups it into one
 * Payout per astrologer.
 *
 * **Idempotency is the whole design.** Payout jobs get retried — by a cron that
 * fires twice, by an admin who is not sure the first click worked, by a deploy
 * mid-run. Paying an astrologer twice is not something you can quietly undo, so
 * the claim is an UPDATE ... WHERE payoutId IS NULL. The database decides which
 * rows a run gets; a second run over the same period finds nothing left to claim
 * and creates nothing.
 *
 * The totals are then read back FROM the claimed rows rather than computed
 * beforehand, so the Payout can only ever record what it actually took.
 */

export type PayoutRunResult = {
    payouts: Array<{
        astrologerId: string;
        payoutId: string;
        creditsServed: number;
        amountPaise: number;
    }>;
    totalPaise: number;
    skipped: number;
};

/**
 * @param upTo         claim earnings created strictly before this instant
 * @param minimumPaise astrologers below this threshold roll over to next time
 */
export async function runPayouts(
    upTo: Date,
    minimumPaise = 0
): Promise<PayoutRunResult> {
    const pending = await prisma.astrologerEarning.groupBy({
        by: ['astrologerId'],
        where: { payoutId: null, createdAt: { lt: upTo } },
        _sum: { amountPaise: true, creditsServed: true },
        _min: { createdAt: true },
    });

    const result: PayoutRunResult = { payouts: [], totalPaise: 0, skipped: 0 };

    for (const group of pending) {
        const provisional = group._sum.amountPaise ?? 0;
        if (provisional < minimumPaise) {
            // Left unclaimed, so it simply rolls into the next run.
            result.skipped += 1;
            continue;
        }

        try {
            const payout = await prisma.$transaction(async (tx) => {
                const created = await tx.payout.create({
                    data: {
                        astrologerId: group.astrologerId,
                        periodStart: group._min.createdAt ?? upTo,
                        periodEnd: upTo,
                        creditsServed: 0,
                        amountPaise: 0,
                        status: 'PENDING',
                    },
                    select: { id: true },
                });

                // The claim. Anything another run took in the meantime no longer
                // matches payoutId: null and is simply not ours.
                await tx.astrologerEarning.updateMany({
                    where: {
                        astrologerId: group.astrologerId,
                        payoutId: null,
                        createdAt: { lt: upTo },
                    },
                    data: { payoutId: created.id },
                });

                const claimed = await tx.astrologerEarning.aggregate({
                    where: { payoutId: created.id },
                    _sum: { amountPaise: true, creditsServed: true },
                });

                const amountPaise = claimed._sum.amountPaise ?? 0;
                const creditsServed = claimed._sum.creditsServed ?? 0;

                // A race could leave us with nothing. Drop the empty shell rather
                // than leaving a ₹0 payout in the astrologer's history.
                if (amountPaise === 0) {
                    await tx.payout.delete({ where: { id: created.id } });
                    return null;
                }

                await tx.payout.update({
                    where: { id: created.id },
                    data: { amountPaise, creditsServed },
                });

                return { id: created.id, amountPaise, creditsServed };
            });

            if (!payout) {
                result.skipped += 1;
                continue;
            }

            result.payouts.push({
                astrologerId: group.astrologerId,
                payoutId: payout.id,
                creditsServed: payout.creditsServed,
                amountPaise: payout.amountPaise,
            });
            result.totalPaise += payout.amountPaise;
        } catch (error) {
            // One astrologer failing must not abandon the rest of the run.
            console.error(`[payouts] failed for astrologer ${group.astrologerId}:`, error);
            result.skipped += 1;
        }
    }

    return result;
}

/**
 * Records that a payout was actually sent.
 *
 * Separate from creating it on purpose: money leaves via a bank transfer or
 * RazorpayX, which can fail after the row exists. Keeping PENDING distinct from
 * PAID means a failed transfer is visible rather than assumed.
 */
export async function markPayoutPaid(
    payoutId: string,
    reference: string,
    notes?: string
): Promise<void> {
    await prisma.payout.update({
        where: { id: payoutId },
        data: {
            status: 'PAID',
            reference,
            paidAt: new Date(),
            ...(notes ? { notes } : {}),
        },
    });
}
