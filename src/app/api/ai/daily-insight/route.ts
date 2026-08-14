import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { generateDailyInsight } from '@/lib/ai/geminiService';
import { guardAiSpend } from '@/lib/ai/costGuard';
import type { ChartData } from '@/lib/astrology/zodiac';
import { getZodiacSign } from '@/lib/astrology/zodiac';

/**
 * The seeker's note for today.
 *
 * ONE model call per seeker per calendar day. That guarantee lives here, in the
 * unique (userId, date) on DailyInsight — not in the browser. The client caches
 * the text in localStorage so the day's second and third visit cost nothing at
 * all, but localStorage cannot be the authority: a second device, another
 * browser, a private window or a cleared cache would each buy a fresh
 * generation, and the bill scales with the whole user base.
 *
 * `date` is the SEEKER'S local calendar day, sent by the client, because that
 * is the day they are actually living. Deriving it from server time would roll
 * over mid-evening for anyone east of UTC, which is most of this audience.
 * JournalEntry already keys on a client-supplied YYYY-MM-DD for the same reason.
 */

/** Guards against a client asking for an arbitrary or far-future day. */
function isPlausibleLocalDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const asked = Date.parse(value + 'T00:00:00Z');
    if (Number.isNaN(asked)) return false;
    // A day either side of UTC covers every real timezone offset.
    const skewMs = 36 * 60 * 60 * 1000;
    return Math.abs(asked - Date.now()) < skewMs;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { date } = await req.json().catch(() => ({}));
        if (!isPlausibleLocalDate(date)) {
            return NextResponse.json(
                { error: 'A `date` of YYYY-MM-DD within a day of now is required.' },
                { status: 400 }
            );
        }

        // Already written for this seeker today: return it and do not call the
        // model. This is the common path — every visit after the first.
        const existing = await prisma.dailyInsight.findUnique({
            where: { userId_date: { userId: session.user.id, date } },
            select: { content: true, createdAt: true },
        });
        if (existing) {
            return NextResponse.json({ insight: existing.content, cached: true, generatedAt: existing.createdAt });
        }

        const profile = await prisma.profile.findFirst({
            where: { userId: session.user.id, isActive: true },
            orderBy: { createdAt: 'desc' },
            // Explicit: this runs on every first-visit-of-the-day, and a column
            // added to Profile ahead of its migration would otherwise P2022 it.
            select: { id: true, name: true, chartData: true },
        });

        if (!profile?.chartData) {
            return NextResponse.json({ error: 'No chart yet', code: 'PROFILE_MISSING' }, { status: 404 });
        }

        // Only now — after the cache miss and the profile check — does spend
        // become possible, so this is where the rate guard belongs.
        const limited = guardAiSpend(session.user.id, 'daily-insight');
        if (limited) return limited;

        const chart = profile.chartData as unknown as ChartData;
        const dashaLord = Array.isArray(chart.dashas)
            ? (chart.dashas.find((d) => {
                const now = Date.now();
                return Date.parse(d.start) <= now && now < Date.parse(d.end);
            })?.lord ?? null)
            : null;

        const moonLongitude = chart.planets?.Moon?.longitude;
        const insight = await generateDailyInsight(chart, {
            name: profile.name,
            dashaLord,
            moonSign: typeof moonLongitude === 'number' ? getZodiacSign(moonLongitude) : null,
            weekday: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
        });

        // create, not upsert: two tabs opening at once both miss the read above,
        // and the unique key is what stops the second one paying for a call that
        // is already in flight. The loser reads the winner's row instead.
        try {
            await prisma.dailyInsight.create({
                data: {
                    userId: session.user.id,
                    date,
                    content: insight as unknown as Prisma.InputJsonValue,
                    profileId: profile.id,
                    dashaLord,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const winner = await prisma.dailyInsight.findUnique({
                    where: { userId_date: { userId: session.user.id, date } },
                    select: { content: true },
                });
                if (winner) return NextResponse.json({ insight: winner.content, cached: true });
            } else {
                throw error;
            }
        }

        return NextResponse.json({ insight, cached: false });
    } catch (error) {
        console.error('Daily insight error:', error);
        return NextResponse.json({ error: 'Failed to generate your note for today' }, { status: 500 });
    }
}
