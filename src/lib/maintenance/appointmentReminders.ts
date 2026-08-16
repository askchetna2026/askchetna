import prisma from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push/send';
import { sendAppointmentReminderEmail } from '@/lib/mail';
import { whatsappClient } from '@/lib/whatsapp/client';

/**
 * The 24-hour and 1-hour appointment reminders, and the housekeeping that
 * retires appointments nobody acted on.
 *
 * Lifted out of the cron route so it can be driven by something other than a
 * cron. The route's own comment said it was "scheduler-agnostic on purpose"
 * and that any scheduler could drive it — which was true, except that no
 * scheduler ever did: `392c147` removed the crons block and nothing has called
 * this endpoint since. Confirmed appointments have been quietly going
 * unreminded, and requests nobody answered have been sitting in the queue
 * instead of expiring.
 *
 * A route module may only export handlers, so this could not live there and be
 * importable. It lives here and the route is now a thin authenticated wrapper.
 *
 * Safe to call as often as you like. `remindedDayBefore` / `remindedHourBefore`
 * are set in the same update that selects the rows, so two callers at once
 * cannot send the same notice twice.
 */

/** Both windows are generous — a scheduler running late must not miss a
 *  reminder because it woke a minute after the boundary. */
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

export interface ReminderResult {
    remindedDayBefore: number;
    remindedHourBefore: number;
    expiredRequests: number;
    markedNoShow: number;
}

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

        if (a.user.whatsappOptIn && a.user.phone) {
            const templateName = 'appointment_reminder_1hr';
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

export async function runAppointmentReminders(): Promise<ReminderResult> {
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

    return {
        remindedDayBefore: dayRows.length,
        remindedHourBefore: hourRows.length,
        expiredRequests: staleRequests.count,
        markedNoShow: missed.count,
    };
}
