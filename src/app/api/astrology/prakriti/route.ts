import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { ChartData } from '@/lib/astrology/zodiac';
import { calculatePrakriti } from '@/lib/astrology/prakriti';
import { cached } from '@/lib/astrology/skyCache';

/**
 * Constitutional tendency, derived from the seeker's own chart.
 *
 * No model call and no ephemeris: everything comes out of the stored chart, so
 * this is arithmetic over data already on the row. Cached on the chart's
 * updatedAt, because the only thing that can change the answer is the chart
 * being recalculated.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profileId = req.nextUrl.searchParams.get('profileId');

        const profile = await prisma.profile.findFirst({
            where: profileId
                ? { id: profileId, userId: session.user.id }
                : { userId: session.user.id, isActive: true },
            orderBy: profileId ? undefined : { createdAt: 'asc' },
            select: { id: true, name: true, chartData: true, updatedAt: true },
        });

        if (!profile?.chartData) {
            return NextResponse.json(
                { error: 'No chart yet', code: 'PROFILE_MISSING' },
                { status: 404 }
            );
        }

        const result = await cached(
            `prakriti:${profile.id}:${profile.updatedAt.getTime()}`,
            24 * 60 * 60 * 1000,
            async () => calculatePrakriti(profile.chartData as unknown as ChartData)
        );

        if (!result) {
            return NextResponse.json(
                { error: 'That chart does not carry enough to read this from', code: 'CHART_INCOMPLETE' },
                { status: 422 }
            );
        }

        return NextResponse.json(
            { profileId: profile.id, name: profile.name, ...result },
            { headers: { 'Cache-Control': 'private, max-age=3600' } }
        );
    } catch (error) {
        console.error('Prakriti error:', error);
        return NextResponse.json({ error: 'Could not read that' }, { status: 500 });
    }
}
