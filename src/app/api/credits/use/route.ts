import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeSendLowCreditLifecycleEmail } from '@/lib/lifecycleEmails';

export async function POST() {
    try {
        // requireUser, not auth(): this handler inserts a CreditTransaction
        // carrying a userId foreign key, and a JWT can outlive the user it
        // names. Without the existence check that surfaces as "Foreign key
        // constraint violated" — a 500 whose message says nothing about the
        // one fix, signing in again. See src/lib/apiAuth.ts.
        //
        // The old check was `!session?.user`, which passes for a session whose
        // user object exists but carries no id — the queries below then read
        // `userId: undefined` and match the wrong rows. This is a credit-spend
        // path, so that mattered more here than most.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        // Find oldest pack with available credits
        const creditPack = await prisma.creditPack.findFirst({
            where: {
                userId: session.user.id,
                questionsUsed: {
                    lt: prisma.creditPack.fields.questionsTotal,
                },
            },
            orderBy: {
                purchasedAt: 'asc',
            },
        });

        if (!creditPack) {
            return NextResponse.json(
                { error: 'No credits available' },
                { status: 402 } // Payment Required
            );
        }

        // Deduct one credit and log usage
        await prisma.$transaction([
            prisma.creditPack.update({
                where: { id: creditPack.id },
                data: {
                    questionsUsed: {
                        increment: 1,
                    },
                },
            }),
            prisma.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -1,
                    description: 'Used 1 credit',
                    metadata: {
                        source: 'api/credits/use',
                        packId: creditPack.id
                    }
                }
            })
        ]);

        const remaining = creditPack.questionsTotal - creditPack.questionsUsed - 1;

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.CREDIT_USED,
            path: '/api/credits/use',
            userId: session.user.id,
            metadata: {
                feature: 'generic_credit_use',
                creditsUsed: 1,
                packId: creditPack.id,
                remaining,
            }
        });

        void maybeSendLowCreditLifecycleEmail({
            userId: session.user.id,
            remainingCredits: remaining,
            source: 'generic_credit_low_email',
            returnTo: '/dashboard',
        }).catch((emailError) => {
            console.error('Low credit lifecycle email failed:', emailError);
        });

        return NextResponse.json({
            success: true,
            remaining,
            packId: creditPack.id,
        });
    } catch (error) {
        console.error('Credit deduction error:', error);
        return NextResponse.json(
            { error: 'Failed to use credit' },
            { status: 500 }
        );
    }
}
