/**
 * The arithmetic behind the pull-to-refresh gesture, kept separate from the
 * component so it can be exercised without a touchscreen.
 *
 * The component owns the listeners and the DOM; everything here is a pure
 * function of how far a finger has travelled.
 */

/** How far the finger travels before a release will actually reload. */
export const THRESHOLD = 72;

/** Drag beyond the threshold is damped so the indicator eases to a stop rather
 *  than tracking the finger forever — the resistance a native list has. */
export const MAX_PULL = 132;
export const DAMPING = 0.45;

/** Below this, a drag is treated as an accidental twitch during a tap. */
export const DEAD_ZONE = 6;

export type PullState =
    /** Not a pull: an upward drag, which is an ordinary scroll. Stand down for
     *  the rest of the gesture so a pull cannot resume halfway down the page. */
    | { kind: 'abandon' }
    /** Too small to mean anything yet. Do not claim the gesture — doing so
     *  early swallows taps. */
    | { kind: 'ignore' }
    /** A pull, with how far the indicator should be drawn. */
    | { kind: 'pull'; distance: number };

/** What a vertical drag of `delta` pixels from the start of the gesture means. */
export function pullState(delta: number): PullState {
    if (delta < 0) return { kind: 'abandon' };
    if (delta < DEAD_ZONE) return { kind: 'ignore' };

    const damped =
        delta <= THRESHOLD ? delta : THRESHOLD + (delta - THRESHOLD) * DAMPING;

    return { kind: 'pull', distance: Math.min(damped, MAX_PULL) };
}

/** Whether releasing at this distance should reload. */
export const willRefresh = (distance: number): boolean => distance >= THRESHOLD;

/** How much of the progress ring to draw, 0–1. */
export const pullProgress = (distance: number): number =>
    Math.max(0, Math.min(distance / THRESHOLD, 1));
