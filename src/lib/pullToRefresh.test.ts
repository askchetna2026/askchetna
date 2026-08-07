import { describe, it, expect } from 'vitest';
import {
    pullState, willRefresh, pullProgress,
    THRESHOLD, MAX_PULL, DEAD_ZONE,
} from './pullToRefresh';

/**
 * A gesture that misjudges any of these is worse than not having it: too eager
 * and it eats taps and fights scrolling, too reluctant and it feels broken.
 */

describe('pullState', () => {
    it('abandons on an upward drag, because that is a scroll', () => {
        expect(pullState(-1).kind).toBe('abandon');
        expect(pullState(-80).kind).toBe('abandon');
    });

    it('ignores a twitch, so a tap is never stolen', () => {
        expect(pullState(0).kind).toBe('ignore');
        expect(pullState(DEAD_ZONE - 1).kind).toBe('ignore');
    });

    it('claims the gesture once past the dead zone', () => {
        expect(pullState(DEAD_ZONE).kind).toBe('pull');
    });

    it('tracks the finger one-to-one up to the threshold', () => {
        // Before the commit point the indicator should feel attached to the
        // finger; damping there would read as lag.
        for (const d of [10, 40, THRESHOLD]) {
            const s = pullState(d);
            expect(s.kind === 'pull' && s.distance).toBe(d);
        }
    });

    it('damps beyond the threshold instead of following forever', () => {
        const past = pullState(THRESHOLD + 100);
        expect(past.kind).toBe('pull');
        if (past.kind !== 'pull') return;
        expect(past.distance).toBeGreaterThan(THRESHOLD);
        expect(past.distance).toBeLessThan(THRESHOLD + 100);
    });

    it('never exceeds the ceiling, however hard the pull', () => {
        const s = pullState(5000);
        expect(s.kind === 'pull' && s.distance).toBe(MAX_PULL);
    });

    it('is monotonic — pulling further never moves the indicator back', () => {
        let previous = 0;
        for (let d = DEAD_ZONE; d < 600; d += 7) {
            const s = pullState(d);
            if (s.kind !== 'pull') continue;
            expect(s.distance).toBeGreaterThanOrEqual(previous);
            previous = s.distance;
        }
    });
});

describe('willRefresh', () => {
    it('does not fire below the threshold', () => {
        expect(willRefresh(THRESHOLD - 1)).toBe(false);
    });

    it('fires exactly at the threshold, matching what the label promised', () => {
        // The label flips to "Release to refresh" at the threshold, so
        // releasing there must actually refresh.
        expect(willRefresh(THRESHOLD)).toBe(true);
    });
});

describe('pullProgress', () => {
    it('runs 0 to 1 across the threshold and then holds', () => {
        expect(pullProgress(0)).toBe(0);
        expect(pullProgress(THRESHOLD / 2)).toBeCloseTo(0.5);
        expect(pullProgress(THRESHOLD)).toBe(1);
        expect(pullProgress(MAX_PULL)).toBe(1);
    });

    it('is complete exactly when a release would refresh', () => {
        // The ring finishing and the gesture arming are the same moment, or the
        // indicator is lying about what will happen.
        for (const d of [0, 20, THRESHOLD - 1, THRESHOLD, MAX_PULL]) {
            expect(pullProgress(d) === 1).toBe(willRefresh(d));
        }
    });
});
