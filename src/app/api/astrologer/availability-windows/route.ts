import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * The astrologer's published weekly windows — the times they will take booked
 * sessions. Read and replaced wholesale, because a weekly schedule is edited as
 * a shape rather than a row at a time.
 */

const MAX_WINDOWS = 30;

async function approvedAstrologer(userId: string) {
    return prisma.astrologer.findUnique({
        where: { userId },
        select: { id: true, status: true },
    });
}

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const astrologer = await approvedAstrologer(session.user.id);
    if (!astrologer) return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });

    const windows = await prisma.astrologerAvailability.findMany({
        where: { astrologerId: astrologer.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
        select: { id: true, dayOfWeek: true, startMinute: true, endMinute: true, timezone: true },
    });

    return NextResponse.json({ windows });
}

export async function PUT(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const astrologer = await approvedAstrologer(session.user.id);
    if (!astrologer) return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    if (astrologer.status !== 'APPROVED') {
        return NextResponse.json(
            { error: `Your profile is ${astrologer.status.toLowerCase()}.` },
            { status: 403 }
        );
    }

    let body: { timezone?: string; windows?: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }> };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const timezone = (body.timezone ?? '').trim();
    // Validated against the runtime's own zone database rather than a list we
    // would have to maintain. A bad zone here would silently shift every slot.
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
        return NextResponse.json({ error: 'Unrecognised time zone.' }, { status: 400 });
    }

    const windows = Array.isArray(body.windows) ? body.windows : [];
    if (windows.length > MAX_WINDOWS) {
        return NextResponse.json(
            { error: `At most ${MAX_WINDOWS} windows.` },
            { status: 400 }
        );
    }

    for (const w of windows) {
        const ok =
            Number.isInteger(w.dayOfWeek) && w.dayOfWeek >= 0 && w.dayOfWeek <= 6 &&
            Number.isInteger(w.startMinute) && w.startMinute >= 0 && w.startMinute < 1440 &&
            Number.isInteger(w.endMinute) && w.endMinute > w.startMinute && w.endMinute <= 1440;
        if (!ok) {
            return NextResponse.json(
                { error: 'A window needs a day, and an end later than its start.' },
                { status: 400 }
            );
        }
    }

    // Replace rather than merge. Deleting and re-inserting inside one
    // transaction means a failed write cannot leave half a schedule published —
    // which would silently offer times the astrologer had just removed.
    await prisma.$transaction([
        prisma.astrologerAvailability.deleteMany({ where: { astrologerId: astrologer.id } }),
        prisma.astrologerAvailability.createMany({
            data: windows.map((w) => ({
                astrologerId: astrologer.id,
                dayOfWeek: w.dayOfWeek,
                startMinute: w.startMinute,
                endMinute: w.endMinute,
                timezone,
            })),
        }),
    ]);

    return NextResponse.json({ ok: true, count: windows.length, timezone });
}
