import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getSettings } from '@/lib/consultations/settings';
import { getBalance } from '@/lib/consultations/credits';
import {
    appointmentRef,
    expandSlots,
    BOOKING_HORIZON_DAYS,
    MIN_NOTICE_MINUTES,
} from '@/lib/appointments';

/** Both sides of the diary: what I have booked, or what has been booked with me. */
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const as = url.searchParams.get('as') === 'astrologer' ? 'astrologer' : 'seeker';

    let where;
    if (as === 'astrologer') {
        const me = await prisma.astrologer.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        });
        if (!me) return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
        where = { astrologerId: me.id };
    } else {
        where = { userId: session.user.id };
    }

    const appointments = await prisma.appointment.findMany({
        where,
        orderBy: { startAt: 'asc' },
        take: 100,
        select: {
            id: true, ref: true, startAt: true, blocks: true, status: true,
            counterAt: true, counterNote: true, creditsCharged: true,
            astrologer: { select: { id: true, displayName: true, photoUrl: true } },
            user: { select: { name: true, image: true } },
        },
    });

    return NextResponse.json({
        appointments: appointments.map((a) => ({
            ...a,
            startAt: a.startAt.toISOString(),
            counterAt: a.counterAt?.toISOString() ?? null,
        })),
    });
}

/**
 * Requests a slot. Nothing is charged here — credits leave at confirmation,
 * which is the moment the astrologer's time actually stops being sellable.
 *
 * The balance IS checked, though. Letting someone request a time they could
 * never pay for wastes the astrologer's decision and produces a confusing
 * failure at the accept step, on the wrong person's screen.
 */
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { astrologerId?: string; startAt?: string; blocks?: number };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const blocks = Math.min(4, Math.max(1, Number(body.blocks ?? 1)));
    const startAt = new Date(body.startAt ?? '');
    if (Number.isNaN(startAt.getTime())) {
        return NextResponse.json({ error: 'Invalid time.' }, { status: 400 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { id: body.astrologerId ?? '' },
        select: { id: true, userId: true, status: true, isAI: true, creditsPerBlock: true, displayName: true },
    });
    if (!astrologer || astrologer.status !== 'APPROVED' || astrologer.isAI) {
        return NextResponse.json({ error: 'Astrologer not available.' }, { status: 404 });
    }

    // One account can be both a seeker and an astrologer, which is fine — but
    // not for the same session.
    if (astrologer.userId === session.user.id) {
        return NextResponse.json(
            { error: 'You cannot book an appointment with yourself.' },
            { status: 400 }
        );
    }

    const now = new Date();
    if (startAt.getTime() < now.getTime() + MIN_NOTICE_MINUTES * 60000) {
        return NextResponse.json(
            { error: 'That time is too soon. Please choose one at least two hours away.' },
            { status: 400 }
        );
    }

    const settings = await getSettings();

    // The requested instant must be one this astrologer actually publishes.
    // Trusting the client here would let anyone book 3am by posting a raw
    // timestamp.
    const windows = await prisma.astrologerAvailability.findMany({
        where: { astrologerId: astrologer.id },
        select: { dayOfWeek: true, startMinute: true, endMinute: true, timezone: true },
    });
    const offered = expandSlots(
        windows, now, BOOKING_HORIZON_DAYS, settings.CHAT_SECONDS_PER_CREDIT, blocks
    );
    if (!offered.some((s) => s.getTime() === startAt.getTime())) {
        return NextResponse.json(
            { error: 'That time is no longer offered. Please pick another.' },
            { status: 409 }
        );
    }

    const creditsPerBlock = astrologer.creditsPerBlock ?? 1;
    const cost = creditsPerBlock * blocks;
    const balance = await getBalance(prisma, session.user.id);
    if (balance < cost) {
        return NextResponse.json(
            {
                error: 'Not enough credits',
                message: `This appointment costs ${cost} credit${cost === 1 ? '' : 's'} and you have ${balance}. Credits are taken when the astrologer confirms.`,
                required: cost,
                available: balance,
            },
            { status: 402 }
        );
    }

    try {
        const appointment = await prisma.appointment.create({
            data: {
                ref: appointmentRef(),
                userId: session.user.id,
                astrologerId: astrologer.id,
                startAt,
                blocks,
                status: 'REQUESTED',
            },
            select: { id: true, ref: true, startAt: true, status: true },
        });

        return NextResponse.json({
            appointment: { ...appointment, startAt: appointment.startAt.toISOString() },
            message: `Requested. ${astrologer.displayName} will confirm or suggest another time. Nothing is charged until then.`,
        });
    } catch {
        // The @@unique([astrologerId, startAt]) doing its job: somebody else
        // took this instant between the slot listing and this write.
        return NextResponse.json(
            { error: 'Someone just took that time. Please pick another.' },
            { status: 409 }
        );
    }
}
