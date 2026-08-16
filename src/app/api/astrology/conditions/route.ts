import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { calculateChart } from '@/lib/astrology/calculator';
import { VedicAnalysisEngine } from '@/lib/astrology/engine';
import type { ChartData } from '@/lib/astrology/calculator';
import { CONDITION_ORDER } from '@/lib/astrology/conditions';
import type { YogaFinding } from '@/lib/astrology/conditions';
import { cached, utcHourKey } from '@/lib/astrology/skyCache';

/**
 * Whether the five named conditions apply to one seeker's chart.
 *
 * Every condition comes back whether or not it is present. That is the whole
 * point of the surface: "Do I have Mangal Dosha?" is the question people
 * actually arrive with, and "no" is the answer more of them need. A route that
 * returned only what applies could not give it, and silence reads as evasion on
 * a topic where the rest of the internet is happy to frighten people.
 *
 * Four of the five are fixed at birth. Sade Sati depends on where Saturn is
 * today, so it needs a transit chart — which is why this cannot simply reuse
 * /api/astrology/analysis.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profileId = req.nextUrl.searchParams.get('profileId');
        if (!profileId) {
            return NextResponse.json({ error: 'profileId required' }, { status: 400 });
        }

        const profile = await prisma.profile.findFirst({
            where: { id: profileId, userId: session.user.id },
            select: {
                id: true,
                name: true,
                chartData: true,
                latitude: true,
                longitude: true,
                updatedAt: true,
            },
        });

        if (!profile?.chartData) {
            return NextResponse.json(
                { error: 'Profile or chart not found', code: 'PROFILE_MISSING' },
                { status: 404 }
            );
        }

        const natal = profile.chartData as unknown as ChartData;
        const now = new Date();

        // Two caches with different lifetimes, because the two halves have
        // different reasons to change. The natal conditions cannot change
        // without the chart being recalculated, which moves updatedAt; Sade
        // Sati changes only when Saturn changes sign, which an hourly key
        // tracks with room to spare.
        const natalFindings = await cached(
            `conditions:natal:${profile.id}:${profile.updatedAt.getTime()}`,
            24 * 60 * 60 * 1000,
            async () => VedicAnalysisEngine.detectYogas(natal)
        );

        const sadeSati = await cached(
            `conditions:sadesati:${profile.id}:${utcHourKey(now)}`,
            60 * 60 * 1000,
            async () => {
                const transitChart = await calculateChart(
                    now.getUTCFullYear(),
                    now.getUTCMonth() + 1,
                    now.getUTCDate(),
                    now.getUTCHours() + now.getUTCMinutes() / 60,
                    profile.latitude,
                    profile.longitude
                );
                return VedicAnalysisEngine.sadeSatiFinding(natal, transitChart);
            }
        );

        const byKey = new Map<string, YogaFinding>(
            [...natalFindings, sadeSati].map((f) => [f.key, f])
        );

        // Ordered by the content module, so the page and the API agree on
        // sequence without the page having to know astrology.
        const conditions = CONDITION_ORDER.map((key) => byKey.get(key)).filter(
            (f): f is YogaFinding => !!f
        );

        return NextResponse.json(
            { profileId: profile.id, name: profile.name, conditions },
            // Private — it is a reading of one person's chart. An hour, bounded
            // by the shorter-lived of the two halves.
            { headers: { 'Cache-Control': 'private, max-age=3600' } }
        );
    } catch (error) {
        console.error('Conditions calculation error:', error);
        return NextResponse.json({ error: 'Failed to check conditions' }, { status: 500 });
    }
}
