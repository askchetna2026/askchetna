import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getSettings } from '@/lib/consultations/settings';
import { spendCredits, refundCredits } from '@/lib/consultations/credits';
import {
    APPOINTMENT_ACTIONS,
    type AppointmentAction,
    refundDue,
    FREE_CANCEL_HOURS,
    MIN_NOTICE_MINUTES,
} from '@/lib/appointments';

/**
 * Accept, counter, decline or cancel.
 *
 * The money rule lives here and nowhere else: credits leave the seeker at
 * CONFIRMED — the moment both sides have agreed and the astrologer's time stops
 * being sellable to anyone else — and are returned according to `refundDue`.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    let body: { action?: string; startAt?: string; note?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const action = body.action as AppointmentAction | undefined;
    if (!action || !(action in APPOINTMENT_ACTIONS)) {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    const rule = APPOINTMENT_ACTIONS[action];

    const appointment = await prisma.appointment.findUnique({
        where: { id },
        select: {
            id: true, ref: true, userId: true, astrologerId: true, startAt: true,
            blocks: true, status: true, counterAt: true, creditsCharged: true,
            astrologer: { select: { userId: true, creditsPerBlock: true, displayName: true } },
        },
    });
    if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Who is asking, and are they allowed to take THIS action?
    const isSeeker = appointment.userId === session.user.id;
    const isAstrologer = appointment.astrologer.userId === session.user.id;
    if (!isSeeker && !isAstrologer) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const actorRole = isAstrologer ? 'ASTROLOGER' : 'SEEKER';
    if (rule.by !== actorRole) {
        return NextResponse.json(
            { error: 'That is not your action to take.' },
            { status: 403 }
        );
    }
    if (!(rule.from as readonly string[]).includes(appointment.status)) {
        return NextResponse.json(
            {
                error: `This appointment is ${appointment.status.toLowerCase()} and cannot be changed that way.`,
                status: appointment.status,
            },
            { status: 409 }
        );
    }

    // ── COUNTER: propose a different time. Nothing is charged. ──────────────
    if (action === 'COUNTER') {
        const counterAt = new Date(body.startAt ?? '');
        if (Number.isNaN(counterAt.getTime())) {
            return NextResponse.json({ error: 'Invalid time.' }, { status: 400 });
        }
        if (counterAt.getTime() < Date.now() + MIN_NOTICE_MINUTES * 60000) {
            return NextResponse.json(
                { error: 'Propose a time at least two hours away.' },
                { status: 400 }
            );
        }
        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                status: 'COUNTERED',
                counterAt,
                counterNote: (body.note ?? '').trim().slice(0, 500) || null,
            },
            select: { id: true, ref: true, status: true, counterAt: true },
        });
        return NextResponse.json({
            appointment: { ...updated, counterAt: updated.counterAt?.toISOString() ?? null },
            message: 'Suggested. The seeker will confirm or let it lapse.',
        });
    }

    // ── ACCEPT / ACCEPT_COUNTER: agreement reached, so credits move. ────────
    if (action === 'ACCEPT' || action === 'ACCEPT_COUNTER') {
        const settings = await getSettings();
        const creditsPerBlock = appointment.astrologer.creditsPerBlock ?? 1;
        const cost = creditsPerBlock * appointment.blocks;
        // Accepting a counter also moves the appointment to the proposed time.
        const finalStart =
            action === 'ACCEPT_COUNTER' && appointment.counterAt
                ? appointment.counterAt
                : appointment.startAt;

        try {
            const result = await prisma.$transaction(async (tx) => {
                const spend = await spendCredits(
                    tx,
                    appointment.userId,
                    cost,
                    `Appointment ${appointment.ref} with ${appointment.astrologer.displayName}`,
                    { appointmentId: appointment.id, ref: appointment.ref }
                );
                if (!spend.ok) return { ok: false as const, spend };

                const saved = await tx.appointment.update({
                    where: { id },
                    data: {
                        status: 'CONFIRMED',
                        startAt: finalStart,
                        counterAt: null,
                        creditsCharged: cost,
                        // Snapshotted, so a later repricing cannot rewrite what
                        // this appointment cost.
                        creditsPerBlock,
                        secondsPerBlock: settings.CHAT_SECONDS_PER_CREDIT,
                    },
                    select: { id: true, ref: true, status: true, startAt: true, creditsCharged: true },
                });
                return { ok: true as const, saved };
            });

            if (!result.ok) {
                return NextResponse.json(
                    {
                        error: 'Not enough credits',
                        message:
                            actorRole === 'ASTROLOGER'
                                ? 'The seeker no longer has enough credits for this appointment.'
                                : `This costs ${cost} credit${cost === 1 ? '' : 's'} and you have ${result.spend.available}.`,
                        required: cost,
                        available: result.spend.available,
                    },
                    { status: 402 }
                );
            }

            return NextResponse.json({
                appointment: { ...result.saved, startAt: result.saved.startAt.toISOString() },
                message: `Confirmed. ${cost} credit${cost === 1 ? '' : 's'} taken.`,
            });
        } catch {
            // Moving to the counter-offered time can collide with another
            // booking that was made in the meantime.
            return NextResponse.json(
                { error: 'That time has just been taken. Suggest another.' },
                { status: 409 }
            );
        }
    }

    // ── DECLINE / CANCEL / WITHDRAW ─────────────────────────────────────────
    const refund = refundDue(appointment.startAt, actorRole);
    const wasCharged = appointment.creditsCharged;

    await prisma.$transaction(async (tx) => {
        if (wasCharged > 0 && refund) {
            await refundCredits(
                tx,
                appointment.userId,
                wasCharged,
                `Refund — appointment ${appointment.ref} cancelled`,
                { appointmentId: appointment.id, cancelledBy: actorRole }
            );
        }
        await tx.appointment.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledBy: actorRole,
                cancelReason: (body.note ?? '').trim().slice(0, 500) || null,
            },
        });
    });

    return NextResponse.json({
        ok: true,
        refunded: wasCharged > 0 && refund ? wasCharged : 0,
        message:
            wasCharged === 0
                ? 'Cancelled.'
                : refund
                  ? `Cancelled. ${wasCharged} credit${wasCharged === 1 ? '' : 's'} returned.`
                  : `Cancelled. Credits are not returned inside ${FREE_CANCEL_HOURS} hours of the start time.`,
    });
}
