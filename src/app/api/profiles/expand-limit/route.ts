import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeSendLowCreditLifecycleEmail } from '@/lib/lifecycleEmails';

export async function POST() {
    try {
        // requireUser, not auth(): this handler inserts a row with a userId
        // foreign key, and a JWT can outlive the user it names. Without the
        // existence check that surfaces as "Foreign key constraint violated"
        // — a 500 whose message says nothing about the one fix, signing in
        // again. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        // Fetch expansion cost from database
        const serviceCost = await prisma.serviceCost.findUnique({
            where: { key: 'EXPAND_PROFILE_LIMIT' }
        });
        const EXPANSION_COST = serviceCost?.credits || 50;

        // Check hard cap of 10 profiles
        const maxProfilesDefault = parseInt(process.env.MAX_ACTIVE_PROFILES || '5');
        const currentLimitRecord = await prisma.userProfileLimit.findFirst({
            where: { userId: session.user.id },
            orderBy: { purchasedAt: 'desc' }
        });
        const extraSlots = currentLimitRecord?.extraSlots || 0;

        if (maxProfilesDefault + extraSlots >= 10) {
            return NextResponse.json(
                { error: 'Strict limit reached. Maximum of 10 profiles allowed per user.' },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            const creditPacks = await tx.creditPack.findMany({
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

            const totalCredits = creditPacks.reduce(
                (sum, pack) => sum + (pack.questionsTotal - pack.questionsUsed),
                0
            );

            if (totalCredits < EXPANSION_COST) {
                throw new Error('INSUFFICIENT_CREDITS');
            }

            let creditsToDeduct = EXPANSION_COST;
            for (const pack of creditPacks) {
                if (creditsToDeduct <= 0) break;
                const available = pack.questionsTotal - pack.questionsUsed;
                const deduct = Math.min(available, creditsToDeduct);

                await tx.creditPack.update({
                    where: { id: pack.id },
                    data: {
                        questionsUsed: { increment: deduct }
                    }
                });

                creditsToDeduct -= deduct;
            }

            const latestLimitRecord = await tx.userProfileLimit.findFirst({
                where: { userId: session.user.id },
                orderBy: { purchasedAt: 'desc' }
            });

            const limitRecord = latestLimitRecord
                ? await tx.userProfileLimit.update({
                    where: { id: latestLimitRecord.id },
                    data: { extraSlots: latestLimitRecord.extraSlots + 1 }
                })
                : await tx.userProfileLimit.create({
                    data: {
                        userId: session.user.id,
                        extraSlots: 1,
                    },
                });

            await tx.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -EXPANSION_COST,
                    description: 'Expanded profile limit (+1 slot)',
                    metadata: {
                        previousExtraSlots: latestLimitRecord?.extraSlots || 0,
                        newExtraSlots: limitRecord.extraSlots
                    }
                },
            });

            return {
                limitRecord,
                remainingCredits: totalCredits - EXPANSION_COST,
            };
        });

        const newLimit = maxProfilesDefault + result.limitRecord.extraSlots;

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.CREDIT_USED,
            path: '/dashboard/profiles',
            userId: session.user.id,
            metadata: {
                feature: 'profile_limit_expansion',
                creditsUsed: EXPANSION_COST,
                extraSlots: result.limitRecord.extraSlots,
                newLimit,
            }
        });

        void maybeSendLowCreditLifecycleEmail({
            userId: session.user.id,
            remainingCredits: result.remainingCredits,
            source: 'profile_expansion_low_credit_email',
            returnTo: '/dashboard',
        }).catch((emailError) => {
            console.error('Low credit lifecycle email failed:', emailError);
        });

        return NextResponse.json({
            success: true,
            newLimit,
            extraSlots: result.limitRecord.extraSlots,
            creditsUsed: EXPANSION_COST,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
            return NextResponse.json(
                { error: 'Insufficient credits' },
                { status: 402 }
            );
        }
        console.error('Profile limit expansion error:', error);
        return NextResponse.json(
            { error: 'Failed to expand profile limit' },
            { status: 500 }
        );
    }
}
