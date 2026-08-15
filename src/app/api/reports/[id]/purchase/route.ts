import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeSendLowCreditLifecycleEmail } from '@/lib/lifecycleEmails';

const REPORT_COST = 99;

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // requireUser, not auth(): this handler inserts a row with a userId
        // foreign key, and a JWT can outlive the user it names. Without the
        // existence check that surfaces as "Foreign key constraint violated"
        // — a 500 whose message says nothing about the one fix, signing in
        // again. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        const { id } = await params;

        const profile = await prisma.profile.findFirst({
            where: {
                id,
                userId: session.user.id
            },
            select: {
                id: true,
                name: true
            }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const report = await prisma.report.upsert({
            where: { profileId: profile.id },
            update: {},
            create: {
                profileId: profile.id,
                status: 'pending'
            }
        });

        if (report.status === 'purchased' || report.status === 'generated') {
            return NextResponse.json({
                success: true,
                message: 'Report already unlocked.'
            });
        }

        const purchaseResult = await prisma.$transaction(async (tx) => {
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

            const totalAvailable = creditPacks.reduce(
                (sum, pack) => sum + (pack.questionsTotal - pack.questionsUsed),
                0
            );

            if (totalAvailable < REPORT_COST) {
                throw new Error('INSUFFICIENT_CREDITS');
            }

            let remainingToDeduct = REPORT_COST;
            for (const pack of creditPacks) {
                if (remainingToDeduct <= 0) break;
                const packAvailable = pack.questionsTotal - pack.questionsUsed;
                const toDeduct = Math.min(packAvailable, remainingToDeduct);

                await tx.creditPack.update({
                    where: { id: pack.id },
                    data: {
                        questionsUsed: {
                            increment: toDeduct,
                        },
                    },
                });

                remainingToDeduct -= toDeduct;
            }

            await tx.report.update({
                where: { profileId: profile.id },
                data: {
                    status: 'purchased'
                }
            });

            await tx.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -REPORT_COST,
                    description: `Unlocked life report for ${profile.name}`,
                    metadata: {
                        profileId: profile.id,
                        reportId: report.id
                    }
                }
            });

            return {
                remainingCredits: totalAvailable - REPORT_COST,
            };
        });

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.CREDIT_USED,
            path: `/report/${profile.id}`,
            userId: session.user.id,
            metadata: {
                feature: 'premium_report_unlock',
                creditsUsed: REPORT_COST,
                profileId: profile.id,
                reportId: report.id,
            }
        });

        void maybeSendLowCreditLifecycleEmail({
            userId: session.user.id,
            remainingCredits: purchaseResult.remainingCredits,
            source: 'report_low_credit_email',
            returnTo: `/report/${profile.id}`,
        }).catch((emailError) => {
            console.error('Low credit lifecycle email failed:', emailError);
        });

        return NextResponse.json({
            success: true,
            message: 'Report unlocked successfully!'
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
            return NextResponse.json({
                error: 'Insufficient credits',
                message: `You need ${REPORT_COST} credits to unlock this report.`
            }, { status: 402 });
        }
        console.error('Purchase error:', error);
        return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 });
    }
}
