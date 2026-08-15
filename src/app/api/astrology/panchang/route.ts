import { NextRequest, NextResponse } from 'next/server';
import { calculatePanchang } from '@/lib/astrology/calculator';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { cached, coordKey, utcHourKey } from '@/lib/astrology/skyCache';

/**
 * Today's panchang for the seeker's birth coordinates.
 *
 * Personal only in which coordinates it is asked about — the answer for a given
 * place and moment is the same for every seeker who shares that place, so it is
 * memoised on (rounded coordinates, UTC hour) and shared. An audience clustered
 * in a few cities collapses to a handful of entries.
 *
 * Hourly rather than daily: tithi and nakshatra do change during a day, at
 * boundaries that fall wherever they fall. An hour is short enough that the
 * widget is never meaningfully wrong, and long enough that the ephemeris is off
 * the path for every visit after the first.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({
                error: 'Unauthorized',
                code: 'AUTH_REQUIRED'
            }, { status: 401 });
        }

        // Coordinates only. This used to select every column, dragging the whole
        // chartData JSON across the wire to read two floats off it.
        const profile = await prisma.profile.findFirst({
            where: { userId: session.user.id },
            select: { latitude: true, longitude: true },
        });

        if (!profile) {
            return NextResponse.json({
                error: 'Profile not found. Please complete onboarding.',
                code: 'PROFILE_MISSING'
            }, { status: 404 });
        }

        const lat = profile.latitude;
        const lng = profile.longitude;

        const now = new Date();
        const panchang = await cached(
            `panchang:${coordKey(lat, lng)}:${utcHourKey(now)}`,
            60 * 60 * 1000,
            () => calculatePanchang(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1,
                now.getUTCDate(),
                now.getUTCHours() + now.getUTCMinutes() / 60,
                lat,
                lng
            )
        );

        return NextResponse.json(panchang, {
            // Private: the coordinates are the seeker's, even though the reading
            // itself is not secret. No shared CDN copy.
            headers: { 'Cache-Control': 'private, max-age=600' },
        });
    } catch (error: unknown) {
        console.error('Panchang calculation error:', error);

        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }

        if (String(error).includes('swisseph')) {
            console.error('POTENTIAL WASM ISSUE in Panchang: swisseph-wasm module failed. Check Webpack config.');
        }

        return NextResponse.json({
            error: 'Failed to calculate Panchang',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
