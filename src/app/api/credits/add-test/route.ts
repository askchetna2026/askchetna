import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';

export async function POST() {
    try {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json(
                { error: 'Not available in production' },
                { status: 404 }
            );
        }

        // requireUser, not auth(): this grants a CreditPack and writes a
        // CreditTransaction, both carrying a userId foreign key. Dev-only and
        // admin-gated, so the stale-session case is remote here — but a credit
        // grant is the last place to leave the check out on the grounds that it
        // probably will not happen. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId, email: authed.email } };

        if (!await isAdmin(session.user.email)) {
            return NextResponse.json(
                { error: 'Admin access required.' },
                { status: 403 }
            );
        }

        // Add 10 test credits
        await prisma.$transaction([
            prisma.creditPack.create({
                data: {
                    userId: session.user.id,
                    packType: 'TEST_CREDITS',
                    questionsTotal: 10,
                    questionsUsed: 0,
                    paymentId: `test_${Date.now()}`,
                    amount: 0,
                },
            }),
            prisma.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: 10,
                    description: 'Admin test credit grant',
                    metadata: { source: 'api/credits/add-test' }
                }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: '10 test credits added successfully!',
            currentBalanceLink: '/clarity'
        });
    } catch (error) {
        console.error('Test credit error:', error);
        return NextResponse.json(
            { error: 'Failed to add test credits' },
            { status: 500 }
        );
    }
}
