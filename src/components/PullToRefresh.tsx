'use client';

import { useEffect, useRef, useState } from 'react';
import { isClientNativeApp } from '@/lib/platform';
import { pullState, willRefresh, pullProgress, THRESHOLD } from '@/lib/pullToRefresh';
import styles from './PullToRefresh.module.css';

/**
 * Pull down at the top of a screen to reload it. App only.
 *
 * Implemented in the web layer rather than natively, and that is the important
 * decision. The apps do not bundle the site — `capacitor.config.ts` points the
 * WebView at askchetna.com — so a native SwipeRefreshLayout or UIRefreshControl
 * would mean rebuilding and resubmitting both apps for a gesture, and would
 * then be frozen until the next submission. Done here it ships with a Vercel
 * deploy and reaches everyone already holding the app.
 *
 * A complete no-op in a browser: browsers have their own reload affordance and
 * a page that hijacks overscroll on the desktop web is a nuisance.
 */

/**
 * Whether the touch began somewhere that is genuinely at the top.
 *
 * The page itself being at scrollY 0 is not enough: the chat transcript and
 * other panes scroll inside their own containers, and pulling down inside one
 * that is mid-scroll should scroll it, not reload the app.
 */
function atTopOfEverything(target: EventTarget | null): boolean {
    if (window.scrollY > 0) return false;

    let node = target instanceof Element ? target : null;
    while (node && node !== document.body) {
        const style = getComputedStyle(node);
        const scrolls = /(auto|scroll|overlay)/.test(style.overflowY);
        if (scrolls && node.scrollHeight > node.clientHeight) {
            return node.scrollTop <= 0;
        }
        node = node.parentElement;
    }
    return true;
}

export default function PullToRefresh() {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    // Refs rather than state for the gesture itself: these change on every
    // touchmove, and re-rendering the tree sixty times a second to track a
    // finger would make the pull stutter.
    const startY = useRef(0);
    const active = useRef(false);
    const armed = useRef(false);

    useEffect(() => {
        if (!isClientNativeApp()) return;

        const onStart = (e: TouchEvent) => {
            if (refreshing || e.touches.length !== 1) return;
            armed.current = atTopOfEverything(e.target);
            startY.current = e.touches[0].clientY;
            active.current = false;
        };

        const onMove = (e: TouchEvent) => {
            if (!armed.current || refreshing) return;

            const state = pullState(e.touches[0].clientY - startY.current);

            if (state.kind === 'abandon') {
                armed.current = false;
                if (active.current) { active.current = false; setPull(0); }
                return;
            }
            if (state.kind === 'ignore') return;

            // Only now does this become a pull. Claiming the gesture any
            // earlier would swallow taps, and preventing default on every
            // touchmove would cost scroll performance everywhere.
            active.current = true;
            if (e.cancelable) e.preventDefault();
            setPull(state.distance);
        };

        const onEnd = () => {
            if (!active.current) { armed.current = false; return; }
            active.current = false;
            armed.current = false;

            setPull((current) => {
                if (willRefresh(current)) {
                    setRefreshing(true);
                    // A real reload, because that is what the gesture promises.
                    // `router.refresh()` would be cheaper and keep scroll, but it
                    // only re-fetches server components — client-side data would
                    // silently stay stale, which is worse than a moment's wait.
                    window.location.reload();
                    return THRESHOLD;
                }
                return 0;
            });
        };

        // touchstart/touchend stay passive; only touchmove needs to be able to
        // cancel, and it bails out immediately unless a pull is under way.
        document.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd, { passive: true });
        document.addEventListener('touchcancel', onEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', onStart);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('touchcancel', onEnd);
        };
    }, [refreshing]);

    if (pull <= 0 && !refreshing) return null;

    const ready = willRefresh(pull);

    return (
        <div
            className={styles.host}
            style={{ transform: `translateY(${Math.round(pull)}px)` }}
            // Decorative: the reload speaks for itself, and a live region
            // announcing a spinner on every pull is noise.
            aria-hidden="true"
        >
            <span className={`${styles.dial} ${refreshing ? styles.spinning : ''}`}>
                <svg viewBox="0 0 24 24" width="19" height="19">
                    <circle
                        cx="12" cy="12" r="9"
                        fill="none" stroke="currentColor" strokeWidth="2.25"
                        strokeLinecap="round"
                        // The ring draws itself as you pull, so the gesture shows
                        // its own progress instead of needing a caption.
                        strokeDasharray={`${pullProgress(pull) * 56.5} 56.5`}
                        transform="rotate(-90 12 12)"
                    />
                </svg>
            </span>
            <span className={styles.label}>
                {refreshing ? 'Refreshing' : ready ? 'Release to refresh' : 'Pull to refresh'}
            </span>
        </div>
    );
}
