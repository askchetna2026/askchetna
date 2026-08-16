'use client';

import { useEffect, useState } from 'react';
import styles from './SessionTimer.module.css';

/**
 * The visible countdown.
 *
 * Ticks locally once a second so the display is smooth, but the number it counts
 * from always comes from the server — `serverRemaining` is refreshed by polling
 * and resets the local clock whenever it arrives. A device whose clock is two
 * minutes fast would otherwise show a timer that disagrees with the moment the
 * session actually closes, and the user would believe they were robbed of time.
 *
 * Deliberately decides nothing. Expiry and termination are the server's to
 * declare; this only draws the number and reports when it has run out so the
 * page can re-poll.
 */

type Props = {
    /** Seconds remaining as last reported by the server. */
    serverRemaining: number;
    /** Below this, the timer turns urgent. */
    warnAtSeconds: number;
    /** Called when the local countdown reaches zero. Memoise it in the parent. */
    onReachedZero?: () => void;
    /** False until the seeker's first message starts the paid block. */
    started?: boolean;
};

const format = (total: number) => {
    const safe = Math.max(0, total);
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function SessionTimer({
    serverRemaining,
    warnAtSeconds,
    onReachedZero,
    started = true,
}: Props) {
    const [remaining, setRemaining] = useState(serverRemaining);
    const [lastFromServer, setLastFromServer] = useState(serverRemaining);

    // Any fresh server value wins over the local estimate.
    //
    // Adjusted during render rather than in an effect — React's documented way
    // to reset state when a prop changes. It re-renders immediately without
    // committing the intermediate value, so there is no flash of the stale
    // number and no setState from an effect.
    if (serverRemaining !== lastFromServer) {
        setLastFromServer(serverRemaining);
        setRemaining(serverRemaining);
    }

    // Nothing ticks before the first message. The block is bought and waiting;
    // counting down while a seeker reads a bio and composes an opening line is
    // exactly the behaviour this stops.
    useEffect(() => {
        if (!started) return;
        const id = setInterval(() => setRemaining((prev) => prev - 1), 1000);
        return () => clearInterval(id);
    }, [started]);

    // Reaching zero is derived, not tracked in a ref. Firing the callback from
    // an effect keeps both the render and the state updater pure — a ref written
    // during render, or a callback invoked inside setState, are side effects in
    // places React does not guarantee run once.
    const hasReachedZero = started && remaining <= 0;
    useEffect(() => {
        if (hasReachedZero) onReachedZero?.();
    }, [hasReachedZero, onReachedZero]);

    const urgent = started && remaining <= warnAtSeconds;

    return (
        <div
            className={`${styles.timer} ${urgent ? styles.urgent : ''}`}
            role="timer"
            aria-live={urgent ? 'polite' : 'off'}
            aria-label={
                started
                    ? `${format(remaining)} remaining in this consultation`
                    : `${format(remaining)} of consultation time, starting when you send your first message`
            }
        >
            <span className={styles.value}>{format(remaining)}</span>
            <span className={styles.label}>{started ? 'left' : 'on send'}</span>
        </div>
    );
}
