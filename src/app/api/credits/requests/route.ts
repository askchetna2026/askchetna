import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

async function getCreditRequestEligibility(userId: string) {
    const [welcomeBonusPack, pendingRequestCount] = await Promise.all([
        prisma.creditPack.findFirst({
            where: { userId, packType: 'WELCOME_BONUS' },
            select: { questionsTotal: true, questionsUsed: true }
        }),
        prisma.creditRequest.count({
            where: { userId, status: 'PENDING' }
        })
    ]);

    const totalWelcomeCredits = welcomeBonusPack?.questionsTotal ?? 0;
    const usedWelcomeCredits = welcomeBonusPack?.questionsUsed ?? 0;
    const remainingWelcomeCredits = Math.max(0, totalWelcomeCredits - usedWelcomeCredits);
    const welcomeBonusConsumed = !!welcomeBonusPack && remainingWelcomeCredits === 0;
    const hasPendingRequest = pendingRequestCount > 0;

    return {
        welcomeBonusConsumed,
        remainingWelcomeCredits,
        hasPendingRequest,
        canRequest: welcomeBonusConsumed && !hasPendingRequest
    };
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [requests, eligibility] = await Promise.all([
            prisma.creditRequest.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            getCreditRequestEligibility(session.user.id)
        ]);

        return NextResponse.json({ requests, eligibility });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
            return NextResponse.json(
                {
                    requests: [],
                    eligibility: {
                        welcomeBonusConsumed: false,
                        remainingWelcomeCredits: 0,
                        hasPendingRequest: false,
                        canRequest: false
                    },
                    warning: 'Credit requests table is not available yet. Please run Prisma schema sync.'
                },
                { status: 200 }
            );
        }

        console.error('Fetch credit requests error:', error);
        return NextResponse.json({ error: 'Failed to fetch credit requests' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // requireUser, not auth(): this handler inserts a row with a userId
        // foreign key, and a JWT can outlive the user it names. Without the
        // existence check that surfaces as "Foreign key constraint violated"
        // — a 500 whose message says nothing about the one fix, signing in
        // again. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        const body = await req.json();
        const requestedCredits = Number(body?.requestedCredits);
        const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

        if (!Number.isInteger(requestedCredits) || requestedCredits < 1 || requestedCredits > 1000) {
            return NextResponse.json(
                { error: 'Please request a valid number of credits between 1 and 1000.' },
                { status: 400 }
            );
        }

        if (reason.length > 1000) {
            return NextResponse.json(
                { error: 'Reason is too long. Keep it under 1000 characters.' },
                { status: 400 }
            );
        }

        const eligibility = await getCreditRequestEligibility(session.user.id);
        if (!eligibility.welcomeBonusConsumed) {
            return NextResponse.json(
                { error: 'You can request additional credits after using your welcome bonus credits.' },
                { status: 403 }
            );
        }

        if (eligibility.hasPendingRequest) {
            return NextResponse.json(
                { error: 'You already have a pending request. Please wait for admin review.' },
                { status: 409 }
            );
        }

        const requestRecord = await prisma.$transaction(async (tx) => {
            const existingPending = await tx.creditRequest.findFirst({
                where: { userId: session.user.id, status: 'PENDING' },
                select: { id: true }
            });

            if (existingPending) {
                throw new Error('PENDING_REQUEST_EXISTS');
            }

            return tx.creditRequest.create({
                data: {
                    userId: session.user.id,
                    requestedCredits,
                    reason: reason || null,
                    status: 'PENDING'
                }
            });
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Credit request submitted. Our admin team will review it soon.',
                request: requestRecord
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
            return NextResponse.json(
                { error: 'Credit requests feature is not available yet. Please run Prisma schema sync.' },
                { status: 503 }
            );
        }

        if (error instanceof Error && error.message === 'PENDING_REQUEST_EXISTS') {
            return NextResponse.json(
                { error: 'You already have a pending request. Please wait for admin review.' },
                { status: 409 }
            );
        }

        console.error('Create credit request error:', error);
        return NextResponse.json({ error: 'Failed to submit credit request' }, { status: 500 });
    }
}
