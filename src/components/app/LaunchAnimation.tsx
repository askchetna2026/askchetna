'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './LaunchAnimation.module.css';

/**
 * The app's opening beat.
 *
 * The apps load a remote site, so a cold start always spends a second or two
 * fetching before there is anything to look at. Until now that gap was covered
 * by a static plate and a stock Android progress spinner — which is the single
 * most "this is a browser" thing in the whole product, because no app shows a
 * system spinner at launch. This replaces it with the brand mark drawing itself.
 *
 * The gap is therefore not a cost to hide but the slot the animation lives in:
 * the overlay is opaque until the timeline finishes, so whatever the site is
 * doing behind it is invisible, and by the time it dissolves the page beneath
 * has almost always painted.
 *
 * Why in the web layer rather than natively: an iOS launch screen must be a
 * static image (Apple does not allow animation there) and Android caps
 * windowSplashScreenAnimatedIcon at about a second. Neither can hold a beat this
 * long, and neither ships without a store submission. Here it deploys with
 * Vercel like everything else.
 *
 * Geometry is lifted from public/chetna_icon.svg — the same open zodiac ring,
 * five house dots and central sparkle — so this is the app icon coming to life
 * rather than a second piece of artwork that merely resembles it.
 */

/** Cold start only. sessionStorage dies with the webview, which is exactly the
 *  lifetime we want: relaunch replays it, returning from the background does
 *  not. A chime every time someone comes back from WhatsApp is intolerable. */
const SEEN_KEY = 'ac_launch_played';

/**
 * Timed to the sound, not to a guess.
 *
 * launch.wav is exactly 3.00s: a struck attack decaying from -9.7dB to about
 * -56dB by 2.4s, then 0.78s of true silence. So the overlay holds for 2.4s —
 * the point where the bowl has effectively finished ringing — and dissolves
 * over the 600ms that remain. Total 3.00s, landing on the end of the file.
 *
 * The first pass ran the whole thing in 1.9s, which read as hurried and cut the
 * decay off mid-ring. If the sound is ever replaced, these two numbers and the
 * delays in the stylesheet are what has to move with it.
 */
const HOLD_MS = 2400;
const FADE_MS = 600;

export default function LaunchAnimation() {
    const [phase, setPhase] = useState<'idle' | 'playing' | 'fading' | 'done'>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    /** Dismiss the native splash only once our own overlay is on screen, or the
     *  handoff shows a frame of half-loaded page between the two. */
    const dismissNativeSplash = useCallback(async () => {
        try {
            const { SplashScreen } = await import('@capacitor/splash-screen');
            await SplashScreen.hide();
        } catch {
            /* Browser, or plugin unavailable. Neither is a problem. */
        }
    }, []);

    useEffect(() => {
        /* ?launch=1 replays it anywhere, including a desktop browser.
         *
         * Not a debug leftover — it is the only practical way to look at this
         * thing twice. A cold start happens once per app launch by design, so
         * without an override every tweak costs a force-stop on a device, and
         * on the web it could never be seen at all. */
        const forced =
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('launch') === '1';

        // The class is set pre-paint by PLATFORM_BOOTSTRAP_SCRIPT, so this is
        // decided before the first frame and the web never sees the overlay.
        const isApp = document.documentElement.classList.contains('native-app');
        if (!isApp && !forced) {
            setPhase('done');
            return;
        }

        let alreadyPlayed = false;
        try {
            alreadyPlayed = sessionStorage.getItem(SEEN_KEY) === '1';
        } catch {
            /* Private mode — treat as a fresh start rather than skipping. */
        }
        if (alreadyPlayed && !forced) {
            setPhase('done');
            void dismissNativeSplash();
            return;
        }

        try {
            sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
            /* Not worth failing the animation over. */
        }

        setPhase('playing');
        void dismissNativeSplash();

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Capacitor calls setMediaPlaybackRequiresUserGesture(false), so this
        // plays without a tap. It still respects the device's silent switch,
        // which is why there is no mute toggle: the phone already has one.
        if (!reduced) {
            try {
                const audio = new Audio('/sound/launch.wav');
                audio.volume = 0.55;
                audioRef.current = audio;
                void audio.play().catch(() => {
                    /* Autoplay refused, or the file is missing. The animation
                       carries the moment on its own; silence is not a failure. */
                });
            } catch {
                /* Audio unsupported. Same reasoning. */
            }
        }

        const hold = reduced ? 400 : HOLD_MS;
        const toFade = window.setTimeout(() => setPhase('fading'), hold);
        const toDone = window.setTimeout(() => setPhase('done'), hold + FADE_MS);

        return () => {
            window.clearTimeout(toFade);
            window.clearTimeout(toDone);
            const audio = audioRef.current;
            if (audio) {
                audio.pause();
                audioRef.current = null;
            }
        };
    }, [dismissNativeSplash]);

    // Fade the sound out with the visuals rather than letting it run on under
    // the app — the supplied file is longer than the animation.
    useEffect(() => {
        if (phase !== 'fading') return;
        const audio = audioRef.current;
        if (!audio) return;

        const steps = 12;
        const step = audio.volume / steps;
        const id = window.setInterval(() => {
            const next = audio.volume - step;
            if (next <= 0.01) {
                audio.volume = 0;
                audio.pause();
                window.clearInterval(id);
            } else {
                audio.volume = next;
            }
        }, FADE_MS / steps);

        return () => window.clearInterval(id);
    }, [phase]);

    if (phase === 'idle' || phase === 'done') return null;

    return (
        <div
            className={`${styles.overlay} ${phase === 'fading' ? styles.fading : ''}`}
            // Purely decorative and it covers everything: announcing it would
            // read the brand name to a screen reader before the actual screen.
            aria-hidden="true"
        >
            <svg className={styles.mark} viewBox="0 0 64 64">
                <defs>
                    <linearGradient id="launchGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#F5D87A" />
                        <stop offset="1" stopColor="#C49A2B" />
                    </linearGradient>
                </defs>

                {/* The open ring, drawn rather than revealed. pathLength lets the
                    dash values be written as a fraction instead of measuring the
                    arc, which would otherwise need a layout pass to read. */}
                <path
                    className={styles.ring}
                    d="M48.85,46.14 A22 22 0 1 1 48.85,17.86"
                    fill="none"
                    stroke="url(#launchGold)"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    pathLength={100}
                />

                {/* Five house markers, settling in the order the ring reaches them. */}
                {[
                    { cx: 32, cy: 54 },
                    { cx: 16.44, cy: 47.56 },
                    { cx: 10, cy: 32 },
                    { cx: 16.44, cy: 16.44 },
                    { cx: 32, cy: 10 },
                ].map((d, i) => (
                    <circle
                        key={i}
                        className={styles.dot}
                        cx={d.cx}
                        cy={d.cy}
                        r={1.1}
                        fill="url(#launchGold)"
                        style={{ animationDelay: `${900 + i * 110}ms` }}
                    />
                ))}

                {/* The spark, last and centre. */}
                <path
                    className={styles.spark}
                    d="M32,26.5 Q32.825,31.175 37.5,32 Q32.825,32.825 32,37.5 Q31.175,32.825 26.5,32 Q31.175,31.175 32,26.5 Z"
                    fill="url(#launchGold)"
                />
            </svg>

            <p className={styles.wordmark}>ASKCHETNA</p>
        </div>
    );
}
