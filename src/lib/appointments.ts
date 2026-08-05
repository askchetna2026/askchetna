import { randomBytes } from 'crypto';

/**
 * Appointment domain rules: time-zone maths, slot expansion, and the status
 * chain. Kept out of the routes so the seeker side, the astrologer side and the
 * reminder job cannot disagree about what a slot is or what may follow what.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Time zones, without a dependency
//
// Availability is authored in the astrologer's own wall-clock time ("my Tuesday
// evening"), and every stored instant is UTC. Converting between the two needs
// a zone database, which `Intl` already carries — adding luxon or date-fns-tz
// to a free-tier build for two functions is not a trade worth making.
// ─────────────────────────────────────────────────────────────────────────────

/** Minutes `zone` is ahead of UTC at the given instant. Handles DST because
 *  `Intl` resolves the zone at that instant rather than in the abstract. */
export function zoneOffsetMinutes(at: Date, zone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(at);

    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
    // `hour` comes back as 24 at midnight under hour12:false in some engines.
    const hour = get('hour') % 24;
    const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
    return Math.round((asIfUtc - at.getTime()) / 60000);
}

/**
 * The UTC instant for a wall-clock time in `zone`.
 *
 * Two passes on purpose. The first guess uses the offset at the naive instant,
 * which is wrong for times near a DST transition; re-reading the offset at the
 * corrected instant fixes it. Without the second pass, every booking in the
 * week around a clock change lands an hour out.
 */
export function zonedToUtc(
    year: number,
    month: number,
    day: number,
    minutesFromMidnight: number,
    zone: string
): Date {
    const naive = Date.UTC(year, month - 1, day, 0, minutesFromMidnight);
    const firstGuess = naive - zoneOffsetMinutes(new Date(naive), zone) * 60000;
    return new Date(naive - zoneOffsetMinutes(new Date(firstGuess), zone) * 60000);
}

/** Calendar date parts as seen in `zone`. */
export function zonedParts(at: Date, zone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour12: false,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
        year: Number(get('year')),
        month: Number(get('month')),
        day: Number(get('day')),
        dayOfWeek: DAYS.indexOf(get('weekday')),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Slots
// ─────────────────────────────────────────────────────────────────────────────

export type Window = {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    timezone: string;
};

/** Slots are offered on a fixed grid so two seekers cannot book overlapping
 *  odd times, and so `@@unique([astrologerId, startAt])` is a real defence
 *  rather than one that only catches exact collisions. */
export const SLOT_GRID_MINUTES = 30;

/** How far ahead the calendar is open. Longer invites bookings nobody
 *  remembers agreeing to. */
export const BOOKING_HORIZON_DAYS = 21;

/** Nothing may be booked closer than this — the astrologer needs warning, and
 *  a reminder an hour ahead is meaningless for a slot booked in ten minutes. */
export const MIN_NOTICE_MINUTES = 120;

/**
 * Expands recurring weekly windows into concrete UTC start instants.
 *
 * Walks days in the ASTROLOGER's zone rather than in UTC: a window is a
 * property of their local calendar, and iterating UTC days would drop or
 * duplicate one for anybody far from Greenwich.
 */
export function expandSlots(
    windows: Window[],
    from: Date,
    days: number,
    blockSeconds: number,
    blocks: number
): Date[] {
    if (windows.length === 0) return [];
    const needed = Math.ceil((blockSeconds * blocks) / 60);
    const zone = windows[0].timezone;
    const out: Date[] = [];
    const seen = new Set<number>();

    for (let d = 0; d < days; d++) {
        const cursor = new Date(from.getTime() + d * 86400000);
        const { year, month, day, dayOfWeek } = zonedParts(cursor, zone);

        for (const w of windows) {
            if (w.dayOfWeek !== dayOfWeek) continue;
            // The last start that still leaves room for the whole booking.
            for (let m = w.startMinute; m + needed <= w.endMinute; m += SLOT_GRID_MINUTES) {
                const at = zonedToUtc(year, month, day, m, w.timezone);
                if (at.getTime() <= from.getTime() + MIN_NOTICE_MINUTES * 60000) continue;
                // Overlapping windows on the same day would otherwise offer the
                // same instant twice.
                if (seen.has(at.getTime())) continue;
                seen.add(at.getTime());
                out.push(at);
            }
        }
    }
    return out.sort((a, b) => a.getTime() - b.getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Status chain
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Who may do what, from where. Same shape as the astrologer application chain,
 * and for the same reason: without a `from` list every action is reachable from
 * every state, and "confirm" becomes callable on something already cancelled.
 */
export const APPOINTMENT_ACTIONS = {
    /** Astrologer takes the requested time. Credits are charged here. */
    ACCEPT: { to: 'CONFIRMED', from: ['REQUESTED'], by: 'ASTROLOGER' },
    /** Astrologer offers a different time; nothing is charged yet. */
    COUNTER: { to: 'COUNTERED', from: ['REQUESTED'], by: 'ASTROLOGER' },
    /** Seeker takes the counter-offer. Credits are charged here instead. */
    ACCEPT_COUNTER: { to: 'CONFIRMED', from: ['COUNTERED'], by: 'SEEKER' },
    DECLINE: { to: 'CANCELLED', from: ['REQUESTED', 'COUNTERED'], by: 'ASTROLOGER' },
    CANCEL: { to: 'CANCELLED', from: ['REQUESTED', 'COUNTERED', 'CONFIRMED'], by: 'SEEKER' },
    /** Astrologer withdrawing from something already agreed. Always refunds. */
    WITHDRAW: { to: 'CANCELLED', from: ['CONFIRMED'], by: 'ASTROLOGER' },
} as const;

export type AppointmentAction = keyof typeof APPOINTMENT_ACTIONS;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
    REQUESTED: 'Awaiting the astrologer',
    COUNTERED: 'New time proposed',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    NO_SHOW: 'Not attended',
    EXPIRED: 'Expired',
};

/**
 * Free cancellation cut-off.
 *
 * Credits leave the seeker at confirmation, which is the moment the
 * astrologer's time stops being sellable to anyone else — so a late
 * cancellation has a real cost and is not refunded. Twelve hours is long
 * enough that a genuine change of plan is free, short enough that it still
 * protects a reserved evening.
 *
 * An astrologer withdrawing ALWAYS refunds in full, whenever it happens. They
 * are the party who took the booking off the market.
 */
export const FREE_CANCEL_HOURS = 12;

export function refundDue(
    startAt: Date,
    by: 'SEEKER' | 'ASTROLOGER' | 'SYSTEM',
    now = new Date()
): boolean {
    if (by !== 'SEEKER') return true;
    return startAt.getTime() - now.getTime() > FREE_CANCEL_HOURS * 3600_000;
}

/** Human-quotable reference, e.g. AP-3F9A21. */
export function appointmentRef(): string {
    return `AP-${randomBytes(3).toString('hex').toUpperCase()}`;
}
