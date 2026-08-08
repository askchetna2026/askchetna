import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push/send';
import { sendAppointmentReminderEmail } from '@/lib/mail';
import { whatsappClient } from '@/lib/whatsapp/client';

/**
 * Sends the 24-hour and 1-hour reminders for confirmed appointments, and
 * expires requests nobody answered.
 *
 * Scheduler-agnostic on purpose. Vercel's Hobby plan only permits DAILY cron,
 * which cannot deliver a one-hour reminder, so this is a plain authenticated
 * endpoint that any scheduler can drive — Supabase pg_cron, cron-job.org,
 * Cloudflare, a GitHub Action. Nothing here assumes a particular caller or a
 * particular interval; it looks at the clock and sends what is due.
 *
 * Safe to call as often as you like. The `remindedDayBefore` /
 * `remindedHourBefore` flags are set in the same update that selects the row,
 * so a scheduler that fires twice, or two schedulers at once, cannot send the
 * same notice twice.
 */

export const maxDuration = 60;

/** Both windows are generous — a scheduler running every 15 minutes must not
 *  miss a reminder because it woke a minute late. */
const DAY_WINDOW_MS = 26 * 3600_000;
const HOUR_WINDOW_MS = 90 * 60_000;
/** A request nobody answers goes stale rather than sitting in the queue. */
const REQUEST_TTL_HOURS = 48;

type Due = {
    id: string; ref: string; startAt: Date; blocks: number;
    userId: string;
    user: { name: string | null; email: string; phone: string | null; whatsappOptIn: boolean };
    astrologer: { displayName: string; userId: string | null };
};

function whenLine(startAt: Date, zone = 'Asia/Kolkata') {
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: zone, weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(startAt);
}

async function notify(rows: Due[], lead: '24 hours' | '1 hour') {
    for (const a of rows) {
        const when = whenLine(a.startAt);
        const seekerName = a.user.name?.split(' ')[0] ?? 'there';

        // Push and email are independent: a failure in one must not stop the
        // other, and neither must stop the loop.
        const targets = [a.userId, a.astrologer.userId].filter(Boolean) as string[];
        await sendPushToUsers(targets, {
            title: lead === '1 hour' ? 'Your reading starts soon' : 'Reading tomorrow',
            body: `${a.astrologer.displayName} · ${when}`,
            path: '/dashboard',
            data: { appointmentId: a.id, ref: a.ref },
        }).catch((e) => console.error('appointment push failed', a.ref, e));

        await sendAppointmentReminderEmail(a.user.email, {
            seekerName,
            astrologerName: a.astrologer.displayName,
            when,
            lead,
            ref: a.ref,
        }).catch((e) => console.error('appointment email failed', a.ref, e));

        // Send WhatsApp Reminder if opted-in
        if (a.user.whatsappOptIn && a.user.phone) {
            const templateName = 'appointment_reminder_1hr';
            // WhatsApp templates usually expect parameters like: [AstrologerName, Time, JoinLink/Ref]
            const components = [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: a.astrologer.displayName },
                        { type: 'text', text: when }
                    ]
                }
            ];

            await whatsappClient.sendTemplateMessage(a.user.phone, templateName, 'en_US', components)
                .catch((e) => console.error('appointment whatsapp failed', a.ref, e));
        }
    }
}

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error('CRON_SECRET is not configured; refusing to run.');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const select = {
        id: true, ref: true, startAt: true, blocks: true, userId: true,
        user: { select: { name: true, email: true, phone: true, whatsappOptIn: true } },
        astrologer: { select: { displayName: true, userId: true } },
    };

    // Claim first, then send. Selecting and sending before marking would
    // re-send everything if the send throws halfway.
    const dayRows = (await prisma.appointment.findMany({
        where: {
            status: 'CONFIRMED',
            remindedDayBefore: false,
            startAt: { gt: now, lte: new Date(now.getTime() + DAY_WINDOW_MS) },
        },
        select,
        take: 200,
    })) as Due[];
    if (dayRows.length) {
        await prisma.appointment.updateMany({
            where: { id: { in: dayRows.map((r) => r.id) } },
            data: { remindedDayBefore: true },
        });
        await notify(dayRows, '24 hours');
    }

    const hourRows = (await prisma.appointment.findMany({
        where: {
            status: 'CONFIRMED',
            remindedHourBefore: false,
            startAt: { gt: now, lte: new Date(now.getTime() + HOUR_WINDOW_MS) },
        },
        select,
        take: 200,
    })) as Due[];
    if (hourRows.length) {
        await prisma.appointment.updateMany({
            where: { id: { in: hourRows.map((r) => r.id) } },
            data: { remindedHourBefore: true, remindedDayBefore: true },
        });
        await notify(hourRows, '1 hour');
    }

    // Housekeeping. Nothing was charged for these, so there is no refund to
    // make — they simply stop occupying a slot other people could book.
    const staleRequests = await prisma.appointment.updateMany({
        where: {
            status: { in: ['REQUESTED', 'COUNTERED'] },
            createdAt: { lt: new Date(now.getTime() - REQUEST_TTL_HOURS * 3600_000) },
        },
        data: { status: 'EXPIRED' },
    });

    // A confirmed appointment whose time has passed without a session opening.
    // Left as NO_SHOW rather than refunded: deciding who failed to turn up is
    // not something this job can know.
    const missed = await prisma.appointment.updateMany({
        where: {
            status: 'CONFIRMED',
            consultationId: null,
            startAt: { lt: new Date(now.getTime() - 2 * 3600_000) },
        },
        data: { status: 'NO_SHOW' },
    });

    return NextResponse.json({
        ok: true,
        remindedDayBefore: dayRows.length,
        remindedHourBefore: hourRows.length,
        expiredRequests: staleRequests.count,
        markedNoShow: missed.count,
    });
}
