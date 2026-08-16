import { NextRequest, NextResponse } from 'next/server';
import { calculateChart, getZodiacSign } from '@/lib/astrology/calculator';
import { getNakshatra } from '@/lib/astrology/zodiac';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * Moon sign, ascendant and nakshatra from birth details, without an account.
 *
 * The point is the absence of a gate. Someone who wants to know their nakshatra
 * is not yet ready to create an account and read a full chart, and asking them
 * to is how they end up on a competitor's calculator instead.
 *
 * It runs the SAME calculateChart as everything else, deliberately. A separate
 * lightweight formula would drift from the full chart, and then the answer here
 * would disagree with the answer after signing up — which is worse than not
 * offering the calculator at all.
 *
 * Unauthenticated but rate limited, because that shared engine loads a 16.8 MB
 * ephemeris and this is the one route anybody can reach without signing in.
 */

const NAKSHATRA_SIZE = 360 / 27;

/** Which quarter of its nakshatra a longitude falls in. */
function padaOf(longitude: number): number {
    return Math.floor((longitude % NAKSHATRA_SIZE) / (NAKSHATRA_SIZE / 4)) + 1;
}

export async function POST(req: NextRequest) {
    const limit = rateLimit(`quick-calc:${getClientIp(req)}`, {
        limit: 20,
        windowMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
        return NextResponse.json(
            { error: 'Too many calculations. Please wait a moment and try again.' },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        );
    }

    let body: {
        year?: unknown;
        month?: unknown;
        day?: unknown;
        hour?: unknown;
        minute?: unknown;
        lat?: unknown;
        lng?: unknown;
        timezone?: unknown;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    const hour = Number(body.hour);
    const minute = Number(body.minute);
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    // IST, matching calculateChart's own default.
    const timezone = body.timezone === undefined ? 5.5 : Number(body.timezone);

    const finite = [year, month, day, hour, minute, lat, lng, timezone].every(Number.isFinite);
    if (!finite) {
        return NextResponse.json({ error: 'Birth date, time and place are all required' }, { status: 400 });
    }

    // Ranges checked rather than trusted: this endpoint takes input from anyone,
    // and the ephemeris is happier refusing nonsense than extrapolating it.
    const inRange =
        year >= 1800 && year <= 2200 &&
        month >= 1 && month <= 12 &&
        day >= 1 && day <= 31 &&
        hour >= 0 && hour <= 23 &&
        minute >= 0 && minute <= 59 &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        timezone >= -12 && timezone <= 14;

    if (!inRange) {
        return NextResponse.json({ error: 'Those birth details are out of range' }, { status: 400 });
    }

    try {
        const chart = await calculateChart(year, month, day, hour + minute / 60, lat, lng, timezone);

        const moon = chart.planets['Moon'];
        const sun = chart.planets['Sun'];

        if (!moon || !sun) {
            return NextResponse.json({ error: 'Could not calculate that chart' }, { status: 500 });
        }

        const moonNakshatra = getNakshatra(moon.longitude);

        return NextResponse.json({
            moonSign: getZodiacSign(moon.longitude),
            sunSign: getZodiacSign(sun.longitude),
            ascendant: {
                sign: getZodiacSign(chart.ascendant),
                degree: Number((chart.ascendant % 30).toFixed(2)),
            },
            nakshatra: {
                name: moonNakshatra.name,
                lord: moonNakshatra.lord,
                pada: padaOf(moon.longitude),
            },
        });
    } catch (error) {
        console.error('Quick calculation error:', error);
        return NextResponse.json({ error: 'Could not calculate that chart' }, { status: 500 });
    }
}
