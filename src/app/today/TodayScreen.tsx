'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Users, ArrowRight, ChevronRight, Sparkles, Check } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import AppScreenChrome from '@/components/app/AppScreenChrome';
import DailyInsightCard from '@/components/DailyInsightCard';
import CurrentChapterCard from '@/components/CurrentChapterCard';
import { getProfiles, primaryProfile } from '@/lib/profileStore';
import styles from './today.module.css';

interface Transit {
    transit: string;
    theme: string;
    prompt: string;
}

interface Panchang {
    tithi: { name: string; paksha: string };
    vara: string;
    nakshatra: { name: string; lord: string };
    muhurtas?: {
        sunrise: string;
        sunset: string;
        rahuKaalam: { start: string; end: string };
        abhijit: { start: string; end: string };
    };
}

interface RecentQuestion {
    id: string;
    questionText: string;
    createdAt: string;
}

interface DashaPeriod {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
    antardashas?: DashaPeriod[];
}

/** The current mahadasha, its current antardasha, and how far through we are. */
interface Season {
    lord: string;
    sub: string | null;
    percent: number;
    endsOn: string;
}

/** Below this, the balance stops being background information. */
const LOW_CREDIT_THRESHOLD = 3;

const timeOnly = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

export default function TodayScreen() {
    const { data: session } = useSession();
    const { openNewProfileModal } = useProfile();

    const [sky, setSky] = useState<Transit | null>(null);
    const [panchang, setPanchang] = useState<Panchang | null>(null);
    const [needsProfile, setNeedsProfile] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    const [recent, setRecent] = useState<RecentQuestion[]>([]);
    const [season, setSeason] = useState<Season | null>(null);

    // Rendered only after mount. Both derive from the device clock, and the
    // server's clock is in a different timezone — computing them during render
    // produces a hydration mismatch on the first screen of the app.
    const [today, setToday] = useState('');
    const [greeting, setGreeting] = useState('');

    const [note, setNote] = useState('');
    const [noteSaved, setNoteSaved] = useState(false);
    const [savingNote, setSavingNote] = useState(false);

    const firstName = session?.user?.name?.split(' ')[0] || 'Seeker';

    useEffect(() => {
        const now = new Date();
        setToday(
            now.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            })
        );
        const h = now.getHours();
        setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    }, []);

    useEffect(() => {
        let live = true;

        // The sky needs no session and no birth details, so it paints even for
        // an account that has not added a profile yet.
        fetch('/api/astrology/transit')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (live && data && !data.error && data.transit) setSky(data);
            })
            .catch(() => {});

        // The panchang does need both. A missing profile is a first-run state,
        // not an error — it becomes the card's call to action.
        fetch('/api/astrology/panchang')
            .then(async (res) => {
                if (res.ok) return res.json();
                const body = await res.json().catch(() => ({}));
                if (res.status === 404 && body.code === 'PROFILE_MISSING' && live) {
                    setNeedsProfile(true);
                }
                return null;
            })
            .then((data) => {
                if (live && data && !data.error) setPanchang(data);
            })
            .catch(() => {});

        fetch('/api/credits/check')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (live && data && typeof data.totalCredits === 'number') {
                    setCredits(data.totalCredits);
                }
            })
            .catch(() => {});

        fetch('/api/questions')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (live && Array.isArray(data)) setRecent(data.slice(0, 4));
            })
            .catch(() => {});

        // The dasha needs a profile id first, so this is the one chained pair on
        // the screen. Everything else paints without waiting for it.
        (async () => {
            try {
                // Was `cache: 'no-store'` on its own fetch, so this screen
                // always paid a fresh round trip for a profile list the store
                // already had — and which cannot change while the page is open.
                const profileId = primaryProfile(await getProfiles())?.id;
                if (!profileId || !live) return;

                const dashaRes = await fetch(`/api/astrology/dashas?profileId=${profileId}`);
                if (!dashaRes.ok || !live) return;
                const { dashas } = (await dashaRes.json()) as { dashas: DashaPeriod[] };

                const maha = dashas?.find((d) => d.isCurrent);
                if (!maha || !live) return;

                const antar = maha.antardashas?.find((a) => a.isCurrent) ?? null;
                const start = new Date(maha.start).getTime();
                const end = new Date(maha.end).getTime();
                const percent = Math.min(
                    100,
                    Math.max(0, ((Date.now() - start) / (end - start)) * 100)
                );

                setSeason({
                    lord: maha.lord,
                    sub: antar?.lord ?? null,
                    percent,
                    endsOn: new Date(maha.end).toLocaleDateString(undefined, {
                        month: 'short',
                        year: 'numeric',
                    }),
                });
            } catch {
                /* The card simply does not appear. */
            }
        })();

        return () => {
            live = false;
        };
    }, []);

    // Today's journal entry, if there already is one — so the card reads as a
    // continuation rather than asking the same question twice in a day.
    useEffect(() => {
        let live = true;
        const date = new Date().toISOString().split('T')[0];
        fetch(`/api/journal?date=${date}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (live && data?.content) {
                    setNote(data.content);
                    setNoteSaved(true);
                }
            })
            .catch(() => {});
        return () => {
            live = false;
        };
    }, []);

    const saveNote = useCallback(async () => {
        if (!note.trim() || savingNote) return;
        setSavingNote(true);
        try {
            const res = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: new Date().toISOString().split('T')[0],
                    content: note,
                }),
            });
            if (res.ok) setNoteSaved(true);
        } catch {
            /* Leaving the card in its unsaved state is the honest failure here —
               the text is still in the box and the button still says Save. */
        } finally {
            setSavingNote(false);
        }
    }, [note, savingNote]);

    return (
        <div className={styles.screen}>
            <AppScreenChrome />

            {/* ── Who and when ─────────────────────────────────────────────── */}
            <header className={styles.greeting}>
                <div>
                    <p className={styles.greetingLabel}>{greeting || ' '}</p>
                    <h1 className={styles.name}>{firstName}</h1>
                </div>
                {credits !== null && (
                    <Link href="/dashboard" className={styles.creditChip}>
                        <Sparkles size={13} aria-hidden="true" />
                        {credits}
                        <span className={styles.srOnly}> credits — open account</span>
                    </Link>
                )}
            </header>

            {/* ── The one thing that changed since yesterday ────────────────── */}
            <section className={styles.skyCard}>
                <span className={styles.skyDate}>{today || ' '}</span>

                {sky ? (
                    <>
                        <h2 className={styles.skyTransit}>{sky.transit}</h2>
                        <p className={styles.skyTheme}>{sky.theme}</p>
                    </>
                ) : (
                    <div className={styles.skyShimmer} aria-hidden="true" />
                )}

                {panchang && (
                    <dl className={styles.panchang}>
                        <div>
                            <dt>Tithi</dt>
                            <dd>
                                {panchang.tithi.paksha} {panchang.tithi.name}
                            </dd>
                        </div>
                        <div>
                            <dt>Nakshatra</dt>
                            <dd>{panchang.nakshatra.name}</dd>
                        </div>
                        <div>
                            <dt>Vara</dt>
                            <dd>{panchang.vara}</dd>
                        </div>
                    </dl>
                )}

                {needsProfile && (
                    <button
                        type="button"
                        onClick={() => void openNewProfileModal()}
                        className={styles.skySetup}
                    >
                        Add your birth details
                        <ArrowRight size={15} aria-hidden="true" />
                    </button>
                )}

                {!needsProfile && (
                    <Link href="/timing" className={styles.skyLink}>
                        Where this sits in your dasha
                        <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                )}
            </section>

            {/* ── Today's note, written for this seeker ─────────────────────── */}
            {/* Sits between the sky and the season deliberately: the sky says
                what changed, this says what it may mean for them, the season
                says where it sits in the longer arc. The card renders nothing
                at all when there is no chart yet or the model is unreachable,
                so it needs no guard here. */}
            <DailyInsightCard className={styles.dailyNote} />

            {/* The years-long chapter the daily note above sits inside.
                It shipped on the web home only, so the app — where the daily
                note IS the home screen — showed a seeker what today feels like
                with nothing to say which season it belongs to. Same component,
                self-contained, and it renders nothing until it has a real
                phase, so it needs no guard here either. */}
            <CurrentChapterCard className={styles.chapter} />

            {/* ── Which season you are in ──────────────────────────────────── */}
            {/* Deliberately NOT a grid of shortcuts to Chart / Ask / Timing:
                those are three of the five tabs already fixed to the bottom of
                the screen, and repeating them makes the home screen a second
                navigation rather than somewhere to arrive. Everything on this
                screen is content you can read. */}
            {season && (
                <Link href="/timing" className={styles.season}>
                    <div className={styles.seasonHead}>
                        <span className={styles.sectionLabel}>Your season</span>
                        <ChevronRight size={15} aria-hidden="true" />
                    </div>
                    <p className={styles.seasonTitle}>
                        {season.lord}
                        {season.sub && (
                            <span className={styles.seasonSub}> · {season.sub} within it</span>
                        )}
                    </p>
                    <div
                        className={styles.seasonTrack}
                        role="progressbar"
                        aria-valuenow={Math.round(season.percent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${season.lord} mahadasha progress`}
                    >
                        <span
                            className={styles.seasonFill}
                            style={{ width: `${season.percent}%` }}
                        />
                    </div>
                    <p className={styles.seasonFoot}>
                        {Math.round(season.percent)}% through · runs to {season.endsOn}
                    </p>
                </Link>
            )}

            {/* ── Today's windows ──────────────────────────────────────────── */}
            {panchang?.muhurtas && (
                <section className={styles.windows}>
                    <span className={styles.sectionLabel}>Today&apos;s windows</span>
                    <dl className={styles.windowRow}>
                        <div>
                            <dt>Abhijit</dt>
                            <dd>
                                {timeOnly(panchang.muhurtas.abhijit.start)}–
                                {timeOnly(panchang.muhurtas.abhijit.end)}
                            </dd>
                        </div>
                        <div className={styles.windowAvoid}>
                            <dt>Rahu kaal</dt>
                            <dd>
                                {timeOnly(panchang.muhurtas.rahuKaalam.start)}–
                                {timeOnly(panchang.muhurtas.rahuKaalam.end)}
                            </dd>
                        </div>
                        <div>
                            <dt>Sun</dt>
                            <dd>
                                {timeOnly(panchang.muhurtas.sunrise)}–
                                {timeOnly(panchang.muhurtas.sunset)}
                            </dd>
                        </div>
                    </dl>
                </section>
            )}

            {/* ── Reflect ──────────────────────────────────────────────────── */}
            {sky?.prompt && (
                <section className={styles.reflect}>
                    <span className={styles.sectionLabel}>Reflect</span>
                    <p className={styles.reflectPrompt}>{sky.prompt}</p>
                    <textarea
                        className={styles.reflectInput}
                        value={note}
                        onChange={(e) => {
                            setNote(e.target.value);
                            setNoteSaved(false);
                        }}
                        placeholder="A line is enough."
                        rows={2}
                        aria-label="Today's reflection"
                    />
                    <button
                        type="button"
                        className={styles.reflectSave}
                        onClick={() => void saveNote()}
                        disabled={!note.trim() || savingNote || noteSaved}
                    >
                        {noteSaved ? (
                            <>
                                <Check size={14} aria-hidden="true" /> Saved
                            </>
                        ) : savingNote ? (
                            'Saving…'
                        ) : (
                            'Save'
                        )}
                    </button>
                </section>
            )}

            {/* ── Pick up where you left off ───────────────────────────────── */}
            {recent.length > 0 && (
                <section className={styles.continue}>
                    <div className={styles.continueHead}>
                        <span className={styles.sectionLabel}>You asked</span>
                        <Link href="/clarity" className={styles.continueAll}>
                            All
                            <ChevronRight size={13} aria-hidden="true" />
                        </Link>
                    </div>
                    <ul className={styles.continueRail}>
                        {recent.map((q) => (
                            <li key={q.id}>
                                <Link href="/clarity" className={styles.continueCard}>
                                    {q.questionText}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ── The one destination the tab bar does not carry ───────────── */}
            <Link href="/consult" className={styles.consult}>
                <Users size={18} aria-hidden="true" />
                <span>
                    <strong>Talk to an astrologer</strong>
                    <em>A person, not the model</em>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
            </Link>

            {/* ── Balance, only when it matters ────────────────────────────── */}
            {credits !== null && credits < LOW_CREDIT_THRESHOLD && (
                <Link href="/dashboard" className={styles.creditNote}>
                    <span>
                        {credits === 0
                            ? 'You are out of credits.'
                            : `${credits} credit${credits === 1 ? '' : 's'} left.`}{' '}
                        Your chart, timeline and panchang stay free.
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}
