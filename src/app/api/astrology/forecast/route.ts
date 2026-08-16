import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { calculateChart } from '@/lib/astrology/calculator';
import type { ChartData } from '@/lib/astrology/zodiac';
import { buildForecast, HORIZONS, moonSignAt } from '@/lib/astrology/forecast';
import type { Horizon } from '@/lib/astrology/forecast';
import { cached } from '@/lib/astrology/skyCache';

/**
 * Tomorrow, this week, this month, this year — for one seeker's chart.
 *
 * No model call. Everything here is arithmetic over the stored dasha tree and a
 * handful of ephemeris lookups, which is what makes four horizons affordable
 * where four more daily notes would not have been.
 *
 * Cached on (profile, horizon, UTC day). A forecast's answer changes when the
 * day changes or the chart is recalculated, and nothing else moves it — Saturn
 * does not reach a sign boundary between two page views.
 */

/** Day-resolution key: the answer is stable within a calendar day. */
const utcDayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const asked = req.nextUrl.searchParams.get('horizon') ?? 'week';
        if (!HORIZONS.includes(asked as Horizon)) {
            return NextResponse.json({ error: 'Unknown horizon' }, { status: 400 });
        }
        const horizon = asked as Horizon;

        const profile = await prisma.profile.findFirst({
            where: { userId: session.user.id, isActive: true },
            orderBy: { createdAt: 'asc' },
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
                { error: 'No chart yet', code: 'PROFILE_MISSING' },
                { status: 404 }
            );
        }

        const chart = profile.chartData as unknown as ChartData;
        const now = new Date();

        const forecast = await cached(
            `forecast:${profile.id}:${horizon}:${utcDayKey(now)}:${profile.updatedAt.getTime()}`,
            12 * 60 * 60 * 1000,
            async () => {
                // Positions at an arbitrary instant, memoised per UTC day so the
                // bisection inside buildForecast re-uses days it has already
                // asked about instead of re-running the ephemeris for each.
                const positionsAt = async (ms: number) => {
                    const at = new Date(ms);
                    return cached(
                        `sky:${utcDayKey(at)}`,
                        12 * 60 * 60 * 1000,
                        async () => {
                            const c = await calculateChart(
                                at.getUTCFullYear(),
                                at.getUTCMonth() + 1,
                                at.getUTCDate(),
                                12,
                                profile.latitude,
                                profile.longitude
                            );
                            const out: Record<string, number> = {};
                            for (const [name, pos] of Object.entries(c.planets)) {
                                out[name] = pos.longitude;
                            }
                            return out;
                        }
                    );
                };

                const result = await buildForecast(chart, horizon, positionsAt, now.getTime());
                const today = await positionsAt(now.getTime());

                return { ...result, moonSign: moonSignAt(today['Moon']) };
            }
        );

        return NextResponse.json(
            { profileId: profile.id, name: profile.name, ...forecast },
            { headers: { 'Cache-Control': 'private, max-age=3600' } }
        );
    } catch (error) {
        console.error('Forecast error:', error);
        return NextResponse.json({ error: 'Could not build that forecast' }, { status: 500 });
    }
}
