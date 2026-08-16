import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { calculateChart } from '@/lib/astrology/calculator';
import { upcomingObservances } from '@/lib/astrology/calendar';
import { cached, coordKey } from '@/lib/astrology/skyCache';

/**
 * The lunar calendar ahead, for the seeker's own coordinates.
 *
 * Shares the per-day sky memo with /api/astrology/forecast: both walk the same
 * days for different reasons, so the second one to run pays nothing. That is
 * why the key is `sky:<day>` rather than something calendar-specific.
 */

const MAX_DAYS = 90;
const DEFAULT_DAYS = 45;

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const asked = Number(req.nextUrl.searchParams.get('days'));
        const days = Number.isFinite(asked) ? Math.min(Math.max(asked, 7), MAX_DAYS) : DEFAULT_DAYS;

        const profile = await prisma.profile.findFirst({
            where: { userId: session.user.id },
            select: { latitude: true, longitude: true },
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found', code: 'PROFILE_MISSING' },
                { status: 404 }
            );
        }

        // Same longitude-derived offset the muhurat windows use, so a date
        // label here means the same local day it does there.
        const offsetMs = (profile.longitude / 15) * 3600_000;
        const now = Date.now();
        const dayKey = new Date(now + offsetMs).toISOString().slice(0, 10);

        const observances = await cached(
            `calendar:${coordKey(profile.latitude, profile.longitude)}:${dayKey}:${days}`,
            12 * 60 * 60 * 1000,
            async () => {
                const positionsAt = async (ms: number) => {
                    const at = new Date(ms);
                    return cached(
                        `sky:${at.toISOString().slice(0, 10)}`,
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

                return upcomingObservances(now, days, positionsAt, offsetMs);
            }
        );

        return NextResponse.json(
            { from: dayKey, days, observances },
            { headers: { 'Cache-Control': 'private, max-age=3600' } }
        );
    } catch (error) {
        console.error('Calendar error:', error);
        return NextResponse.json({ error: 'Could not build the calendar' }, { status: 500 });
    }
}
