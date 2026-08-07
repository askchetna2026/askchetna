'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, MessageSquareText, CalendarClock } from 'lucide-react';
import AppMedallion from '@/components/app/AppMedallion';
import AppScreenChrome from '@/components/app/AppScreenChrome';
import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import styles from './app-home.module.css';

interface Transit {
    transit: string;
    theme: string;
}

/**
 * One screen: art, a live reading, three lines of substance, one button.
 *
 * The live reading is the part doing the real work. /api/astrology/transit needs
 * no session and no birth details — it is the sky, which is the same for
 * everyone — so the app can show a genuine Moon position on first launch. That
 * turns the welcome screen from a promise into a demonstration, which is the
 * single biggest activation lever the format has. It also degrades quietly: if
 * the call fails, the block collapses and the layout closes over it rather than
 * showing an error to someone who has not yet used the product.
 */
export default function AppWelcome() {
    const [sky, setSky] = useState<Transit | null>(null);
    const tracked = useRef(false);

    useEffect(() => {
        if (tracked.current) return;
        tracked.current = true;
        // Same event the web landing page fires, so the signup funnel still
        // counts app arrivals; the surface is in the metadata.
        void trackEvent(ANALYTICS_EVENTS.LANDING_VIEW, {
            metadata: { loggedIn: false, surface: 'app-welcome' },
        });
    }, []);

    useEffect(() => {
        let live = true;
        fetch('/api/astrology/transit')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (live && data && !data.error && data.transit) setSky(data);
            })
            .catch(() => {
                /* Silent: the block is an ornament to a first-run screen, not content. */
            });
        return () => {
            live = false;
        };
    }, []);

    return (
        <div className={styles.screen}>
            <AppScreenChrome hideFooter />
            <div className={styles.nightSky} aria-hidden="true" />

            <section className={styles.hero}>
                <AppMedallion className={styles.medallion} />
                <h1 className={styles.wordmark}>AskChetna</h1>
                <p className={styles.tagline}>Jyotiṣa · patterns, not predictions</p>
            </section>

            {/* Always in the layout, filled when the ephemeris answers. Mounting
                it only on success would jump the whole stack — including the
                button — half a second after the screen appears, which is the one
                moment the app is being judged. */}
            <section className={styles.skyNow} aria-live="polite">
                {sky ? (
                    <>
                        <span className={styles.skyLabel}>The sky right now</span>
                        <p className={styles.skyTransit}>{sky.transit}</p>
                        <p className={styles.skyTheme}>{sky.theme}</p>
                    </>
                ) : (
                    <span className={styles.skyWaiting} aria-hidden="true" />
                )}
            </section>

            <ul className={styles.proof}>
                {/* One line each, and they must STAY one line: every wrap costs
                    ~19px, and three wraps is the difference between the button
                    sitting above the tab bar and behind it. */}
                <li>
                    <Compass size={17} aria-hidden="true" />
                    <span>Your real kundali, from the Swiss Ephemeris.</span>
                </li>
                <li>
                    <MessageSquareText size={17} aria-hidden="true" />
                    <span>Ask in plain words, get a real answer.</span>
                </li>
                <li>
                    <CalendarClock size={17} aria-hidden="true" />
                    <span>See when your season turns.</span>
                </li>
            </ul>

            <div className={styles.actions}>
                {/* Straight to sign-in, and back to "/" afterwards — which the proxy
                    resolves to Today. Routing new users through /onboarding would
                    replay four screens of the same argument this one just made. */}
                <Link href="/login?callbackUrl=%2F" className={styles.primary}>
                    Cast my chart
                    <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/login?callbackUrl=%2F" className={styles.secondary}>
                    I already have an account
                </Link>
                <p className={styles.fineprint}>Free to start · no card needed</p>
            </div>
        </div>
    );
}
