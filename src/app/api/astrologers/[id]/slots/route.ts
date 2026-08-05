import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSettings } from '@/lib/consultations/settings';
import { expandSlots, BOOKING_HORIZON_DAYS } from '@/lib/appointments';

/**
 * Bookable slots for one astrologer.
 *
 * Computed rather than stored. Materialising a row per slot would mean writing
 * thousands of rows per astrologer per month and re-writing them all whenever a
 * window moved — the windows plus the taken instants are the smaller and more
 * honest source of truth.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const blocks = Math.min(
        4,
        Math.max(1, Number(new URL(request.url).searchParams.get('blocks') ?? '1'))
    );

    const astrologer = await prisma.astrologer.findUnique({
        where: { id },
        select: { id: true, status: true, isAI: true, creditsPerBlock: true },
    });

    // An AI persona is always reachable, so scheduling one is meaningless.
    if (!astrologer || astrologer.status !== 'APPROVED' || astrologer.isAI) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const windows = await prisma.astrologerAvailability.findMany({
        where: { astrologerId: id },
        select: { dayOfWeek: true, startMinute: true, endMinute: true, timezone: true },
    });

    if (windows.length === 0) {
        return NextResponse.json({
            slots: [],
            message: 'This astrologer has not published any times yet.',
        });
    }

    const settings = await getSettings();
    const now = new Date();
    const horizonEnd = new Date(now.getTime() + BOOKING_HORIZON_DAYS * 86400000);

    const candidates = expandSlots(
        windows,
        now,
        BOOKING_HORIZON_DAYS,
        settings.CHAT_SECONDS_PER_CREDIT,
        blocks
    );

    // Anything already spoken for. CANCELLED deliberately not excluded — a
    // cancelled slot returns to the pool, which is the point of cancelling.
    const taken = await prisma.appointment.findMany({
        where: {
            astrologerId: id,
            startAt: { gte: now, lte: horizonEnd },
            status: { in: ['REQUESTED', 'COUNTERED', 'CONFIRMED'] },
        },
        select: { startAt: true },
    });
    const busy = new Set(taken.map((t) => t.startAt.getTime()));

    return NextResponse.json({
        slots: candidates.filter((s) => !busy.has(s.getTime())).map((s) => s.toISOString()),
        blocks,
        creditsPerBlock: astrologer.creditsPerBlock ?? 1,
        minutesPerBlock: Math.round(settings.CHAT_SECONDS_PER_CREDIT / 60),
        timezone: windows[0].timezone,
    });
}
