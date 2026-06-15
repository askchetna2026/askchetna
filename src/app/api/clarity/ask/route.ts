import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { generateClarityResponse, isQuestionSafe } from '@/lib/ai/geminiService';
import { ChartData } from '@/lib/astrology/calculator';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';
import { rateLimit } from '@/lib/rateLimit';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import {
    maybeSendFirstClarityFollowupEmail,
    maybeSendLowCreditLifecycleEmail,
} from '@/lib/lifecycleEmails';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to ask questions.' },
                { status: 401 }
            );
        }

        // Burst protection (credits already cap overall usage)
        const burst = rateLimit(`ask:${session.user.id}`, { limit: 10, windowMs: 60 * 1000 });
        if (!burst.allowed) {
            return NextResponse.json(
                { error: 'You are asking very quickly. Please wait a moment and try again.' },
                { status: 429, headers: { 'Retry-After': String(burst.retryAfterSeconds) } }
            );
        }

        const { question } = await req.json();

        if (!question || question.trim().length < 10) {
            return NextResponse.json(
                { error: 'Please provide a meaningful question (at least 10 characters)' },
                { status: 400 }
            );
        }

        // Safety check
        const safetyCheck = isQuestionSafe(question);
        if (!safetyCheck.safe) {
            return NextResponse.json(
                {
                    error: 'Question not allowed',
                    reason: safetyCheck.reason,
                    reframe: 'Please rephrase your question to focus on patterns and awareness rather than predictions or medical/financial advice.'
                },
                { status: 400 }
            );
        }

        // Check if user has credits
        // Get cost for asking a question from DB
        const serviceCost = await prisma.serviceCost.findUnique({
            where: { key: 'ASK_QUESTION' }
        });

        const creditsRequired = serviceCost?.credits || 1; // Default to 1 if not set

        // Simpler check: Calculate total available credits across all packs
        const allPacks = await prisma.creditPack.findMany({
            where: { userId: session.user.id }
        });

        const totalCreditsAvailable = allPacks.reduce((acc, pack) => acc + (pack.questionsTotal - pack.questionsUsed), 0);

        if (totalCreditsAvailable < creditsRequired) {
            return NextResponse.json(
                {
                    error: `Insufficient credits. This requires ${creditsRequired} credits.`,
                    message: PAYMENTS_ENABLED
                        ? 'Please purchase more credits to ask questions'
                        : PAYMENTS_PAUSED_MESSAGE
                },
                { status: 402 }
            );
        }

        // Get user's most recent chart data
        const profile = await prisma.profile.findFirst({
            where: {
                userId: session.user.id,
                isActive: true
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!profile) {
            return NextResponse.json(
                {
                    error: 'No chart data found',
                    message: 'Please create your birth chart first',
                    redirectTo: '/chart'
                },
                { status: 400 }
            );
        }

        // Generate AI response using Gemini
        const aiResponse = await generateClarityResponse(
            question,
            profile.chartData as unknown as ChartData
        );

        const result = await prisma.$transaction(async (tx) => {
            const packs = await tx.creditPack.findMany({
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

            const availableNow = packs.reduce(
                (sum, pack) => sum + (pack.questionsTotal - pack.questionsUsed),
                0
            );

            if (availableNow < creditsRequired) {
                throw new Error('INSUFFICIENT_CREDITS_RACE');
            }

            let creditsToDeduct = creditsRequired;
            for (const pack of packs) {
                if (creditsToDeduct <= 0) break;
                const availableInPack = pack.questionsTotal - pack.questionsUsed;
                const takeFromPack = Math.min(availableInPack, creditsToDeduct);

                await tx.creditPack.update({
                    where: { id: pack.id },
                    data: { questionsUsed: { increment: takeFromPack } }
                });

                creditsToDeduct -= takeFromPack;
            }

            const savedQuestion = await tx.question.create({
                data: {
                    userId: session.user.id,
                    questionText: question,
                    response: aiResponse as unknown as Prisma.InputJsonValue,
                    chartSnapshot: profile.chartData as unknown as Prisma.InputJsonValue,
                    isPaid: true,
                },
            });

            await tx.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -creditsRequired,
                    description: 'Asked AI clarity question',
                    metadata: {
                        questionId: savedQuestion.id,
                    }
                }
            });

            return {
                questionId: savedQuestion.id,
                remainingCredits: availableNow - creditsRequired,
            };
        });

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.CREDIT_USED,
            path: '/clarity',
            userId: session.user.id,
            metadata: {
                feature: 'clarity_question',
                creditsUsed: creditsRequired,
                questionId: result.questionId,
                questionLength: question.trim().length,
            }
        });

        void maybeSendFirstClarityFollowupEmail({
            userId: session.user.id,
            questionId: result.questionId,
        }).catch((emailError) => {
            console.error('First clarity lifecycle email failed:', emailError);
        });

        void maybeSendLowCreditLifecycleEmail({
            userId: session.user.id,
            remainingCredits: result.remainingCredits,
            source: 'clarity_low_credit_email',
            returnTo: '/clarity',
        }).catch((emailError) => {
            console.error('Low credit lifecycle email failed:', emailError);
        });

        return NextResponse.json({
            success: true,
            response: aiResponse,
            remainingCredits: result.remainingCredits,
            questionId: result.questionId,
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS_RACE') {
            return NextResponse.json(
                {
                    error: 'Insufficient credits.',
                    message: PAYMENTS_ENABLED
                        ? 'Please purchase more credits to ask questions'
                        : PAYMENTS_PAUSED_MESSAGE
                },
                { status: 402 }
            );
        }
        console.error('Clarity API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate response. Please try again.' },
            { status: 500 }
        );
    }
}
