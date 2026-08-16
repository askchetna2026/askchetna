'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

/**
 * `bonusAmount` is resolved by the root layout, which already reads the setting
 * server-side. This component used to ignore that and re-fetch the same number
 * from /api/public/welcome-bonus on mount, which bought nothing and cost a
 * round trip — and until it landed the banner read "Sign up now to get free
 * credits", so the offer arrived a beat after the rest of the page.
 */
/**
 * How long a signup offer keeps being made to someone who has not taken it.
 *
 * Counted from the first time the banner was SEEN, not from a sign-up date —
 * this only ever renders to signed-out visitors, who have no account and
 * therefore no sign-up date to count from. The browser is the only place that
 * fact can live.
 */
const OFFER_DAYS = 10;
const STORE_KEY = 'askchetna:welcome-banner';

type BannerState = { firstSeenAt: number; dismissed: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

/* localStorage IS an external store, so it is read through the hook built for
   one. Deciding in an effect and calling setShow() instead means a render that
   shows the banner followed by one that hides it — a flash of an offer already
   withdrawn — and React now flags the pattern outright. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
    listeners.add(onChange);
    // Another tab dismissing the banner should settle this one too.
    window.addEventListener('storage', onChange);
    return () => {
        listeners.delete(onChange);
        window.removeEventListener('storage', onChange);
    };
}

function getSnapshot(): string | null {
    try {
        return window.localStorage.getItem(STORE_KEY);
    } catch {
        return null;
    }
}

/** Nothing during SSR — the server cannot know, and guessing flashes. */
function getServerSnapshot(): string | null {
    return null;
}

function parseState(raw: string | null): BannerState | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as BannerState;
        return typeof parsed?.firstSeenAt === 'number' ? parsed : null;
    } catch {
        return null;
    }
}

function writeState(next: BannerState) {
    try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
        // A full or disabled localStorage costs a banner that keeps appearing,
        // which is the old behaviour — not worth failing over.
    }
    // `storage` does not fire in the tab that wrote, so tell it directly.
    for (const l of listeners) l();
}

export default function WelcomeBanner({ bonusAmount }: { bonusAmount: number }) {
    const { status } = useSession();

    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const state = useMemo(() => parseState(raw), [raw]);

    // The only thing the effect does is write: start the clock the first time
    // this is seen, and retire the offer once it is over. Every reason the
    // banner can end — sign-in, the X, the ten days running out — is recorded
    // the same way, so the render below only has to read one flag. Deciding the
    // deadline at render time instead would mean calling Date.now() there,
    // which makes the component's output depend on when React happened to run
    // it.
    useEffect(() => {
        if (status === 'loading') return;

        const current = parseState(getSnapshot());

        // Signing in ends the offer for good: the credits have been granted
        // automatically by then (see events.signIn in src/auth.ts), so
        // continuing to advertise them is offering something already given.
        if (status === 'authenticated') {
            if (!current?.dismissed) {
                writeState({ firstSeenAt: current?.firstSeenAt ?? Date.now(), dismissed: true });
            }
            return;
        }

        if (!current) {
            writeState({ firstSeenAt: Date.now(), dismissed: false });
            return;
        }

        if (!current.dismissed && Date.now() - current.firstSeenAt > OFFER_DAYS * DAY_MS) {
            writeState({ ...current, dismissed: true });
        }
    }, [status]);

    const dismiss = () => {
        writeState({ firstSeenAt: state?.firstSeenAt ?? Date.now(), dismissed: true });
    };

    const show = status === 'unauthenticated' && state !== null && !state.dismissed;

    if (!show) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                // Hook for globals.css — the app's home screens hide the floating
                // chrome and this banner. See AppScreenChrome.
                className="app-floating-chrome"
                style={{
                    width: '100%',
                    background: 'linear-gradient(to right, var(--bg-primary), var(--bg-panel))',
                    borderBottom: '1px solid var(--accent-gold)',
                    position: 'relative',
                    zIndex: 50
                }}
            >
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                }}>
                    <Sparkles size={18} color="var(--accent-gold)" />
                    <span style={{
                        color: 'var(--foreground)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        textAlign: 'center'
                    }}>
                        Unlock your spiritual journey!
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginLeft: '6px' }}>
                            {`Sign up now to get ${bonusAmount} free credit${bonusAmount === 1 ? '' : 's'}.`}
                        </span>
                    </span>
                    <Link
                        href="/login"
                        style={{
                            // The one button colour. This was a gold fill, which
                            // made it the odd control out on every screen it
                            // appeared on — and gold is now dark enough to read
                            // as text on parchment, so it was drifting toward
                            // unreadable as a fill too.
                            background: 'var(--btn-bg)',
                            color: 'var(--btn-fg)',
                            padding: '6px 16px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            transition: 'background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Claim Credits
                    </Link>

                    <button
                        onClick={dismiss}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            position: 'absolute',
                            right: '16px'
                        }}
                        aria-label="Close banner"
                    >
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
