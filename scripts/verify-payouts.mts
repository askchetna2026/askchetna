/**
 * Payout run verification.
 *
 * WHAT THIS PROTECTS
 * runPayouts() moves money OUT of the business: it claims every unpaid earning
 * up to a cut-off and groups it into one Payout per astrologer. Payout jobs get
 * retried — a cron that fires twice, an admin unsure the first click worked, a
 * deploy landing mid-run. Paying an astrologer twice is not something you can
 * quietly undo, so the claim is an `UPDATE ... WHERE payoutId IS NULL` and the
 * database decides which rows a run gets.
 *
 * That idempotency is an emergent property of a SQL predicate, not something
 * you can see by reading the function. So it is tested directly, against a real
 * database, rather than inferred. Case 2 below is the one that matters: it runs
 * the same period twice and asserts the second run creates nothing.
 *
 * Also covered: new earnings arriving after a run are picked up next time, and
 * balances under the minimum threshold roll forward instead of being paid or
 * lost.
 *
 * ⚠️ THIS SCRIPT WRITES. Unlike verify-payment-webhook.mjs, which is read-only
 * by design, this one creates users, astrologers, consultations, earnings and
 * payouts, then deletes them in a `finally`. If it is interrupted between the
 * two, it leaves test rows behind — all suffixed with a timestamp and using
 * @test.local emails, so they are identifiable.
 *
 *   NEVER point this at preview or production.
 *
 * The npm script pins .env.local for exactly that reason. Run it with:
 *
 *   npm run verify:payouts
 */
import { PrismaClient } from '@prisma/client';
import { runPayouts, markPayoutPaid } from '@/lib/consultations/payouts';

const prisma = new PrismaClient();
const SUFFIX = Date.now();
let pass = 0;
let fail = 0;

const check = (label: string, actual: unknown, expected: unknown) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(
        `  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`
    );
    ok ? pass++ : fail++;
};

let userA: { id: string } | undefined;
let userB: { id: string } | undefined;
let clientUser: { id: string } | undefined;
const astrologerIds: string[] = [];

try {
    clientUser = await prisma.user.create({
        data: { email: `p-client-${SUFFIX}@test.local` },
    });
    userA = await prisma.user.create({ data: { email: `p-a-${SUFFIX}@test.local` } });
    userB = await prisma.user.create({ data: { email: `p-b-${SUFFIX}@test.local` } });

    const mk = async (userId: string, name: string) => {
        const a = await prisma.astrologer.create({
            data: {
                userId,
                displayName: name,
                languages: ['en'],
                specialities: ['career'],
                status: 'APPROVED',
            },
        });
        astrologerIds.push(a.id);
        return a;
    };

    const astroA = await mk(userA.id, 'Payout A');
    const astroB = await mk(userB.id, 'Payout B');

    /** A settled consultation plus its earning row. */
    const settle = async (astrologerId: string, credits: number) => {
        const c = await prisma.consultation.create({
            data: {
                userId: clientUser!.id,
                astrologerId,
                kind: 'CHAT',
                status: 'ENDED_BY_USER',
                startedAt: new Date(),
                endedAt: new Date(),
                blocksCharged: credits,
                creditsCharged: credits,
                secondsPerBlock: 300,
                creditValuePaise: 5000,
                revenueSharePct: 30,
            },
        });
        await prisma.astrologerEarning.create({
            data: {
                astrologerId,
                consultationId: c.id,
                creditsServed: credits,
                amountPaise: Math.round((credits * 5000 * 30) / 100),
            },
        });
    };

    await settle(astroA.id, 3); // 4500 paise
    await settle(astroA.id, 2); // 3000
    await settle(astroB.id, 1); // 1500

    console.log('\n1. First run claims everything outstanding');
    const upTo = new Date(Date.now() + 1000);
    const run1 = await runPayouts(upTo);
    check('two astrologers paid', run1.payouts.length, 2);
    check('total is 9000 paise', run1.totalPaise, 9000);

    const aPayout = run1.payouts.find((p) => p.astrologerId === astroA.id);
    check('A gets 7500 paise (Rs 75)', aPayout?.amountPaise, 7500);
    check('A credited with 5 credits served', aPayout?.creditsServed, 5);

    console.log('\n2. Re-running the SAME period pays nothing again');
    const run2 = await runPayouts(upTo);
    check('no new payouts', run2.payouts.length, 0);
    check('nothing paid twice', run2.totalPaise, 0);
    const payoutCount = await prisma.payout.count({
        where: { astrologerId: { in: astrologerIds } },
    });
    check('still only two payout records', payoutCount, 2);

    console.log('\n3. New earnings after the run are picked up next time');
    await settle(astroA.id, 4); // 6000 paise
    const run3 = await runPayouts(new Date(Date.now() + 1000));
    check('one astrologer in this run', run3.payouts.length, 1);
    check('only the new earning, 6000 paise', run3.totalPaise, 6000);

    console.log('\n4. Minimum threshold rolls small balances forward');
    await settle(astroB.id, 1); // 1500 paise
    const run4 = await runPayouts(new Date(Date.now() + 1000), 5000);
    check('below threshold, nothing paid', run4.payouts.length, 0);
    check('counted as skipped', run4.skipped, 1);
    const stillUnpaid = await prisma.astrologerEarning.count({
        where: { astrologerId: astroB.id, payoutId: null },
    });
    check('earning left unclaimed for next run', stillUnpaid, 1);

    console.log('\n5. Marking paid records the reference');
    await markPayoutPaid(run1.payouts[0].payoutId, 'TESTREF123', 'verification run');
    const paid = await prisma.payout.findUnique({
        where: { id: run1.payouts[0].payoutId },
    });
    check('status PAID', paid?.status, 'PAID');
    check('reference stored', paid?.reference, 'TESTREF123');
    check('paidAt set', paid?.paidAt !== null, true);
} catch (error) {
    console.error('\nERROR:', (error as Error).message);
    fail++;
} finally {
    if (astrologerIds.length) {
        await prisma.astrologerEarning.deleteMany({
            where: { astrologerId: { in: astrologerIds } },
        });
        await prisma.payout.deleteMany({ where: { astrologerId: { in: astrologerIds } } });
        await prisma.consultation.deleteMany({
            where: { astrologerId: { in: astrologerIds } },
        });
        await prisma.astrologer.deleteMany({ where: { id: { in: astrologerIds } } });
    }
    for (const u of [userA, userB, clientUser]) {
        if (u) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log(`\n${'='.repeat(46)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(46)}`);
    process.exit(fail ? 1 : 0);
}
