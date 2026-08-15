import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { VedicAnalysisEngine } from '@/lib/astrology/engine';
import type { ChartData } from '@/lib/astrology/calculator';
import { cached } from '@/lib/astrology/skyCache';

/**
 * The per-planet reading of a seeker's own chart.
 *
 * VedicAnalysisEngine.analyze() has always produced this — functional role,
 * behaviour zone, emotional tone, dignity, load and what makes a pattern
 * repeat, nakshatra to the pada, and a synthesis block written as prose. It ran
 * on every AI call and was handed to the model as context. No screen has ever
 * shown a field of it.
 *
 * Meanwhile /timing rendered a nine-row table keyed on the dasha lord's name,
 * so two people in the same mahadasha read identical text. The personalised
 * content was being computed, paid for, and thrown away.
 *
 * The reason it never surfaced is structural rather than an oversight: engine.ts
 * imports calculator.ts, which reaches swisseph — the 16.8 MB ephemeris that
 * must never enter a client bundle. So the analysis cannot be computed in the
 * browser and needs a route of its own. This is that route.
 *
 * Cached hard, because a natal chart is fixed at birth: the only thing that can
 * change the answer is the chart being recalculated, which writes a new
 * updatedAt. Keying on it means a refined birth time invalidates the entry and
 * nothing else does.
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
            select: { id: true, name: true, chartData: true, updatedAt: true },
        });

        if (!profile?.chartData) {
            return NextResponse.json(
                { error: 'Profile or chart not found', code: 'PROFILE_MISSING' },
                { status: 404 }
            );
        }

        const chart = profile.chartData as unknown as ChartData;

        const payload = await cached(
            `analysis:${profile.id}:${profile.updatedAt.getTime()}`,
            24 * 60 * 60 * 1000,
            async () => ({
                analysis: VedicAnalysisEngine.analyze(chart),
                yogas: VedicAnalysisEngine.detectYogas(chart),
            })
        );

        return NextResponse.json(
            { profileId: profile.id, name: profile.name, ...payload },
            // Private: it is a reading of one person's chart. Long max-age is
            // safe for the same reason the server memo is — the input cannot
            // change without a new updatedAt, which changes the URL's answer.
            { headers: { 'Cache-Control': 'private, max-age=3600' } }
        );
    } catch (error) {
        console.error('Chart analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyse chart' }, { status: 500 });
    }
}
