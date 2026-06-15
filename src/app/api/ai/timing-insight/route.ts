import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { generateTimingInsight } from '@/lib/ai/geminiService';
import { ChartData } from '@/lib/astrology/calculator';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { profileId, currentDasha } = await req.json();

        if (!profileId || !currentDasha) {
            return NextResponse.json({ error: 'Missing profileId or currentDasha' }, { status: 400 });
        }

        const profile = await prisma.profile.findFirst({
            where: {
                id: profileId,
                userId: session.user.id
            }
        });

        if (!profile || !profile.chartData) {
            return NextResponse.json({ error: 'Profile or chart data not found' }, { status: 404 });
        }

        // For now, let's allow it if they have an active profile
        const insight = await generateTimingInsight(
            profile.chartData as unknown as ChartData,
            currentDasha
        );

        return NextResponse.json({ insight });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to generate timing insight';
        console.error('Timing Insight API Error:', error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
