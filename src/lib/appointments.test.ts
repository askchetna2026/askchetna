import { describe, it, expect } from 'vitest';
import {
    zoneOffsetMinutes,
    zonedToUtc,
    zonedParts,
    expandSlots,
    refundDue,
    appointmentRef,
    APPOINTMENT_ACTIONS,
    SLOT_GRID_MINUTES,
    MIN_NOTICE_MINUTES,
    FREE_CANCEL_HOURS,
    type Window,
} from './appointments';

/**
 * These cover the decisions that cost money when they are wrong: who gets a
 * refund, who may move an appointment from which state, and what instant a
 * seeker's "Tuesday evening" actually is.
 */

describe('refundDue', () => {
    const start = new Date('2026-09-01T12:00:00Z');

    it('refunds a seeker who cancels outside the free window', () => {
        const now = new Date(start.getTime() - (FREE_CANCEL_HOURS + 1) * 3600_000);
        expect(refundDue(start, 'SEEKER', now)).toBe(true);
    });

    it('does NOT refund a seeker who cancels inside it', () => {
        const now = new Date(start.getTime() - (FREE_CANCEL_HOURS - 1) * 3600_000);
        expect(refundDue(start, 'SEEKER', now)).toBe(false);
    });

    it('treats the boundary as inside the window, so the doubt favours nobody by accident', () => {
        const now = new Date(start.getTime() - FREE_CANCEL_HOURS * 3600_000);
        expect(refundDue(start, 'SEEKER', now)).toBe(false);
    });

    it('always refunds when the astrologer withdraws, however late', () => {
        const oneMinuteBefore = new Date(start.getTime() - 60_000);
        expect(refundDue(start, 'ASTROLOGER', oneMinuteBefore)).toBe(true);
    });

    it('always refunds a system cancellation', () => {
        const oneMinuteBefore = new Date(start.getTime() - 60_000);
        expect(refundDue(start, 'SYSTEM', oneMinuteBefore)).toBe(true);
    });
});

describe('APPOINTMENT_ACTIONS', () => {
    it('lets only the astrologer accept, and only something still REQUESTED', () => {
        const accept = APPOINTMENT_ACTIONS.ACCEPT;
        expect(accept.by).toBe('ASTROLOGER');
        expect(accept.to).toBe('CONFIRMED');
        expect([...accept.from]).toEqual(['REQUESTED']);
    });

    it('does not let the astrologer accept something already countered', () => {
        expect([...APPOINTMENT_ACTIONS.ACCEPT.from]).not.toContain('COUNTERED');
    });

    it('gives the seeker, not the astrologer, the counter-offer to accept', () => {
        expect(APPOINTMENT_ACTIONS.ACCEPT_COUNTER.by).toBe('SEEKER');
        expect([...APPOINTMENT_ACTIONS.ACCEPT_COUNTER.from]).toEqual(['COUNTERED']);
    });

    it('separates a seeker cancelling from an astrologer withdrawing', () => {
        // They differ in refund treatment, so they must not collapse into one
        // action reachable by either party.
        expect(APPOINTMENT_ACTIONS.CANCEL.by).toBe('SEEKER');
        expect(APPOINTMENT_ACTIONS.WITHDRAW.by).toBe('ASTROLOGER');
        expect([...APPOINTMENT_ACTIONS.WITHDRAW.from]).toEqual(['CONFIRMED']);
    });

    it('never allows any action out of a terminal state', () => {
        const terminal = ['CANCELLED', 'COMPLETED', 'NO_SHOW', 'EXPIRED'];
        for (const [name, rule] of Object.entries(APPOINTMENT_ACTIONS)) {
            for (const state of terminal) {
                expect(
                    (rule.from as readonly string[]).includes(state),
                    `${name} should not be reachable from ${state}`
                ).toBe(false);
            }
        }
    });
});

describe('zone conversion', () => {
    it('reports a zone ahead of UTC as positive minutes', () => {
        // India is +05:30 year round.
        expect(zoneOffsetMinutes(new Date('2026-06-15T00:00:00Z'), 'Asia/Kolkata')).toBe(330);
    });

    it('resolves the offset at the given instant, not in the abstract', () => {
        const winter = zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/New_York');
        const summer = zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/New_York');
        expect(winter).toBe(-300);
        expect(summer).toBe(-240);
    });

    it('turns a wall-clock time into the right UTC instant', () => {
        // 18:30 in Kolkata is 13:00 UTC.
        expect(zonedToUtc(2026, 9, 1, 18 * 60 + 30, 'Asia/Kolkata').toISOString())
            .toBe('2026-09-01T13:00:00.000Z');
    });

    it('lands the correct instant either side of a DST change', () => {
        // US clocks go forward on 8 March 2026. 10:00 local is -05:00 the day
        // before and -04:00 the day after; a single-pass conversion gets the
        // second one an hour out.
        expect(zonedToUtc(2026, 3, 7, 10 * 60, 'America/New_York').toISOString())
            .toBe('2026-03-07T15:00:00.000Z');
        expect(zonedToUtc(2026, 3, 9, 10 * 60, 'America/New_York').toISOString())
            .toBe('2026-03-09T14:00:00.000Z');
    });

    it('reads calendar parts in the target zone, not the runtime one', () => {
        // 20:00 UTC is already the next day in Kolkata.
        const parts = zonedParts(new Date('2026-09-01T20:00:00Z'), 'Asia/Kolkata');
        expect(parts).toMatchObject({ year: 2026, month: 9, day: 2 });
    });
});

describe('expandSlots', () => {
    const from = new Date('2026-09-01T00:00:00Z'); // a Tuesday
    /** Tuesday 18:00–21:00 IST. */
    const tuesdayEvening: Window = {
        dayOfWeek: 2, startMinute: 18 * 60, endMinute: 21 * 60, timezone: 'Asia/Kolkata',
    };

    it('offers nothing when no windows are published', () => {
        expect(expandSlots([], from, 7, 900, 1)).toEqual([]);
    });

    it('spaces slots on the fixed grid', () => {
        const slots = expandSlots([tuesdayEvening], from, 7, 900, 1);
        expect(slots.length).toBeGreaterThan(1);
        const gap = (slots[1].getTime() - slots[0].getTime()) / 60000;
        expect(gap).toBe(SLOT_GRID_MINUTES);
    });

    it('never offers a time inside the notice period', () => {
        const slots = expandSlots([tuesdayEvening], from, 21, 900, 1);
        const earliest = from.getTime() + MIN_NOTICE_MINUTES * 60000;
        for (const s of slots) expect(s.getTime()).toBeGreaterThan(earliest);
    });

    it('leaves room for the whole booking, not just its start', () => {
        // A 3-hour window fits fewer 2-block slots than 1-block ones, because
        // the last start has to leave room for the full length.
        const one = expandSlots([tuesdayEvening], from, 7, 3600, 1);
        const two = expandSlots([tuesdayEvening], from, 7, 3600, 2);
        expect(two.length).toBeLessThan(one.length);
    });

    it('does not offer the same instant twice when windows overlap', () => {
        const overlapping: Window[] = [
            tuesdayEvening,
            { dayOfWeek: 2, startMinute: 19 * 60, endMinute: 22 * 60, timezone: 'Asia/Kolkata' },
        ];
        const slots = expandSlots(overlapping, from, 7, 900, 1);
        expect(new Set(slots.map((s) => s.getTime())).size).toBe(slots.length);
    });

    it('returns slots in chronological order', () => {
        const slots = expandSlots([tuesdayEvening], from, 21, 900, 1);
        const sorted = [...slots].sort((a, b) => a.getTime() - b.getTime());
        expect(slots.map(String)).toEqual(sorted.map(String));
    });
});

describe('appointmentRef', () => {
    it('is quotable down a phone line and unlikely to collide', () => {
        const refs = new Set(Array.from({ length: 500 }, () => appointmentRef()));
        expect(refs.size).toBe(500);
        for (const ref of refs) expect(ref).toMatch(/^AP-[0-9A-F]{6}$/);
    });
});
