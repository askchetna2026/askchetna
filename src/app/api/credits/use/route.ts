import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeSendLowCreditLifecycleEmail } from '@/lib/lifecycleEmails';

export async function POST() {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

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
