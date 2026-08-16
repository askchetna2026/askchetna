import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { calculateMuhurtas, calculatePanchang } from '@/lib/astrology/calculator';
import {
    choghadiyaFor,
    markWindows,
    INTENTION_BY_KEY,
    NAKSHATRA_CATEGORY,
    CATEGORY_NOTE,
} from '@/lib/astrology/muhurat';
import type { IntentionKey } from '@/lib/astrology/muhurat';
import { NAKSHATRAS } from '@/lib/astrology/zodiac';
import { cached, coordKey } from '@/lib/astrology/skyCache';

/**
 * When to do a particular thing today, at the seeker's own coordinates.
 *
 * Everything here is arithmetic over sunrise and sunset plus two lookup tables,
 * so it is the same answer for everyone at that place on that day — which is
 * what makes it cacheable by (coordinates, day, intention) and what makes it a
 * timing tool rather than a reading.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const key = (req.nextUrl.searchParams.get('intention') ?? 'begin') as IntentionKey;
        const intention = INTENTION_BY_KEY.get(key);
        if (!intention) {
            return NextResponse.json({ error: 'Unknown intention' }, { status: 400 });
        }

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

        // Everything below is anchored to the LOCAL day at the seeker's own
        // coordinates, derived once here.
        //
        // Getting this from UTC is wrong in a way that is invisible until you
        // check: at Mumbai's longitude the local day is already 05:23 when UTC
        // still reads the previous date, so asking for "today" in UTC produced
        // Sunday's Rahu Kaalam rule applied to Monday's daylight — a real
        // window, in the wrong eighth of the day.
        //
        // Longitude rather than the profile's IANA zone, because sunrise itself
        // is computed from longitude. Using the same basis for both keeps the
        // day, the weekday and the sunrise consistent with each other; a
        // political time zone can sit hours from solar time and would put them
        // back out of step at the edges.
        const solarOffsetMs = (profile.longitude / 15) * 3600_000;
        const localNow = new Date(Date.now() + solarOffsetMs);

        const y = localNow.getUTCFullYear();
        const m = localNow.getUTCMonth() + 1;
        const d = localNow.getUTCDate();
        const dayKey = localNow.toISOString().slice(0, 10);
        const weekday = localNow.getUTCDay();

        const now = new Date();

        const day = await cached(
            `muhurat:${coordKey(profile.latitude, profile.longitude)}:${dayKey}`,
            6 * 60 * 60 * 1000,
            async () => {
                const muhurtas = calculateMuhurtas(y, m, d, profile.latitude, profile.longitude);
                const panchang = await calculatePanchang(
                    y, m, d,
                    now.getUTCHours() + now.getUTCMinutes() / 60,
                    profile.latitude,
                    profile.longitude
                );
                return { muhurtas, panchang };
            }
        );

        const windows = markWindows(
            choghadiyaFor(day.muhurtas.sunrise, day.muhurtas.sunset, weekday),
            intention,
            day.muhurtas
        );

        // The day's nakshatra character, which the tradition weighs alongside
        // the window. Resolved by name so a change to the panchang shape
        // surfaces here rather than silently producing an undefined category.
        const nakName = day.panchang?.nakshatra?.name ?? null;
        const nakIndex = nakName ? NAKSHATRAS.indexOf(nakName) : -1;
        const category = nakIndex >= 0 ? NAKSHATRA_CATEGORY[nakIndex] : null;

        return NextResponse.json(
            {
                intention: { key: intention.key, label: intention.label, blurb: intention.blurb },
                // The local day these windows belong to, which is not always
                // the UTC one — see the note above.
                date: dayKey,
                sunrise: day.muhurtas.sunrise,
                sunset: day.muhurtas.sunset,
                abhijit: day.muhurtas.abhijit,
                rahuKaalam: day.muhurtas.rahuKaalam,
                yamaganda: day.muhurtas.yamaganda,
                nakshatra: nakName,
                category,
                categoryNote: category ? CATEGORY_NOTE[category] : null,
                categorySuits: category ? intention.prefersCategories.includes(category) : null,
                windows,
            },
            { headers: { 'Cache-Control': 'private, max-age=1800' } }
        );
    } catch (error) {
        console.error('Muhurat error:', error);
        return NextResponse.json({ error: 'Could not work out the windows' }, { status: 500 });
    }
}
