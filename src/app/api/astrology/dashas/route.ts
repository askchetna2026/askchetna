import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
// From './zodiac', NOT './calculator'. calculateVimsottariDashas is pure
// arithmetic over a moon longitude, but importing it from calculator.ts would
// pull the 16.8 MB ephemeris into this route's bundle and pay its load cost on
// every cold start — for a function that never touches it.
import { calculateVimsottariDashas, type ChartData } from '@/lib/astrology/zodiac';
import { cached, utcHourKey } from '@/lib/astrology/skyCache';

const HOUR_MS = 60 * 60 * 1000;

type Period = { lord: string; start: Date | string; end: Date | string; isCurrent?: boolean };

/**
 * The current Mahadasha and Antardasha, and nothing else.
 *
 * Safe to memoise for an hour despite depending on "now": a Mahadasha runs 6–20
 * years and an Antardasha months, so an hour-old answer can only be wrong
 * within an hour of a boundary the seeker cannot perceive to the minute anyway.
 * The same reasoning the transit route already uses for the Moon's sign.
 */
function currentPhase(dashas: Period[]) {
    const maha = dashas.find((d) => d.isCurrent) ?? null;
    const antar = maha
        ? ((maha as Period & { antardashas?: Period[] }).antardashas ?? []).find((a) => a.isCurrent) ?? null
        : null;

    return {
        current: maha && {
            lord: maha.lord,
            start: maha.start,
            end: maha.end,
            antardasha: antar && { lord: antar.lord, start: antar.start, end: antar.end },
        },
        source: 'stored' as const,
    };
}

/**
 * The seeker's dasha timeline.
 *
 * This used to run a FULL ephemeris chart — every planet, all 17 vargas — for
 * the single purpose of reading `chart.planets.Moon.longitude`, and then throw
 * the rest away. That longitude has been sitting in `Profile.chartData` since
 * the profile was created, and it cannot change: it is fixed by a birth moment.
 *
 * /timing and /today both call this on every visit, so that recomputation was
 * on the critical path of two pages. Measured on the dev server, the first hit
 * of a route that loads the ephemeris costs ~47s and a warm one ~0.16s; in
 * production every cold lambda pays ~3.2s just to require the module.
 *
 * The dasha tree itself is NOT stored, deliberately. It is derived, and at the
 * depth the timing page renders it is ~7.5 MB of JSON — the same bloat that was
 * removed from Profile.chartData. Recomputing it is pure JS and costs
 * microseconds; storing it would cost megabytes on every profile read.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const profileId = searchParams.get('profileId');

        if (profileId) {
            const profile = await prisma.profile.findFirst({
                where: { id: profileId, userId: session.user.id },
                select: { dateOfBirth: true, timeOfBirth: true, latitude: true, longitude: true, chartData: true },
            });
            if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

            const chart = profile.chartData as unknown as ChartData | null;
            const storedMoon = chart?.planets?.Moon?.longitude;
            const storedAscendant = chart?.ascendant;

            // Reconstruct the birth instant in LOCAL terms, matching how the
            // chart was built. The previous code read it with getUTC*, which
            // disagreed with the local-time parse used at profile creation and
            // could land a day out for an evening birth east of UTC.
            const dob = profile.dateOfBirth;
            const [h, m] = (profile.timeOfBirth || '12:00').split(':').map(Number);
            const birthDate = new Date(
                dob.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate(),
                Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0
            );

            if (typeof storedMoon === 'number') {
                // `?current=1` — just the phase the seeker is in right now.
                //
                // The full tree is 757 KB and took ~7s to serialise and ship on
                // the dev box. The home page's chapter card renders a lord, two
                // dates and a sub-period from it — about a hundred bytes — so
                // the whole page was waiting on three quarters of a megabyte it
                // discarded. The timeline at /timing still asks for everything.
                if (searchParams.get('current') === '1') {
                    return NextResponse.json(
                        await cached(
                            `dasha-current:${profileId}:${utcHourKey()}`,
                            HOUR_MS,
                            async () => currentPhase(calculateVimsottariDashas(storedMoon, birthDate)),
                        ),
                    );
                }

                const dashas = calculateVimsottariDashas(storedMoon, birthDate);
                return NextResponse.json({
                    dashas,
                    moonSign: storedMoon,
                    ascendant: storedAscendant ?? null,
                    source: 'stored',
                });
            }

            // Legacy profile with no usable chart. Only here does the ephemeris
            // get loaded, and only via await import() so the module stays out of
            // this route's cold start for everybody else.
            const { calculateChart } = await import('@/lib/astrology/calculator');
            const decimalHour = (Number.isFinite(h) ? h : 12) + (Number.isFinite(m) ? m : 0) / 60;
            const computed = await calculateChart(
                dob.getUTCFullYear(), dob.getUTCMonth() + 1, dob.getUTCDate(),
                decimalHour, profile.latitude, profile.longitude
            );
            return NextResponse.json({
                dashas: calculateVimsottariDashas(computed.planets['Moon'].longitude, birthDate),
                moonSign: computed.planets['Moon'].longitude,
                ascendant: computed.ascendant,
                source: 'computed',
            });
        }

        // Raw birth details, with no saved profile behind them. There is nothing
        // stored to read, so this path genuinely needs the ephemeris.
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        const day = searchParams.get('day');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const hour = searchParams.get('hour') || '12';
        const minute = searchParams.get('minute') || '0';

        if (!year || !month || !day || !lat || !lng) {
            return NextResponse.json({ error: 'Missing birth details' }, { status: 400 });
        }

        const { calculateChart } = await import('@/lib/astrology/calculator');
        const decimalHour = parseInt(hour) + parseInt(minute) / 60;
        const chart = await calculateChart(
            parseInt(year), parseInt(month), parseInt(day),
            decimalHour, parseFloat(lat), parseFloat(lng)
        );
        const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

        return NextResponse.json({
            dashas: calculateVimsottariDashas(chart.planets['Moon'].longitude, birthDate),
            moonSign: chart.planets['Moon'].longitude,
            ascendant: chart.ascendant,
            source: 'computed',
        });
    } catch (error) {
        console.error('Dasha calculation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
