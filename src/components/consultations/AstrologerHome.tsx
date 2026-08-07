'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import AstrologerAvatar from './AstrologerAvatar';
import styles from './AstrologerHome.module.css';

/**
 * The astrologer's own front door.
 *
 * A working screen, not a marketing one: duty state, who is in front of you,
 * what you have been asked to answer, and what you are owed. Deliberately NOT
 * here are the credit balance, "Ask Chetna" and the buy-credits prompts —
 * reading as a customer while on duty is the confusion this page removes.
 *
 * One poll, one endpoint. `/api/astrologer/home` assembles the whole page so a
 * tab left open all day costs 120 requests an hour rather than six times that.
 * 30s is well inside the window in which somebody is deciding whether to wait.
 */

const POLL_MS = 30_000;

type Live = {
    id: string;
    kind: string;
    seeker: string;
    seekerImage: string | null;
    startedAt: string | null;
    remainingSeconds: number;
    expired: boolean;
    blockSeconds: number;
    creditsCharged: number;
};

type Request_ = {
    id: string;
    ref: string;
    startAt: string;
    blocks: number;
    seeker: string;
    seekerImage: string | null;
};

type Upcoming = {
    id: string;
    ref: string;
    status: string;
    startAt: string;
    blocks: number;
    seeker: string;
};

type Hour = {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    timezone: string;
};

type Home = {
    astrologer: {
        displayName: string;
        photoUrl: string | null;
        languages: string[];
        specialities: string[];
        status: string;
        isAvailable: boolean;
        lastSeenAt: string | null;
        creditsPerBlock: number;
    };
    blockSeconds?: number;
    inSession?: Live[];
    waiting?: Live[];
    requests?: Request_[];
    upcoming?: Upcoming[];
    hours?: Hour[];
    today?: { sessions: number; minutes: number; credits: number };
    earnings?: {
        unpaidPaise: number;
        lastPayout: { amountPaise: number; paidAt: string | null } | null;
    };
};

const rupees = (paise: number) =>
    `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const mmss = (s: number) =>
    `${Math.floor(s / 60)}:${(Math.floor(s) % 60).toString().padStart(2, '0')}`;

/** How long somebody has been sitting there, in the coarsest unit that is still
 *  true — an astrologer scanning a queue reads "11m", not "11:04". */
function since(iso: string | null, now: number): string {
    if (!iso) return '—';
    const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const hhmm = (m: number) =>
    `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

const dayFmt = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});
const clockFmt = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

/** "Today" and "Tomorrow" carry further than a date does when the thing is
 *  close, and a date carries further when it is not. */
function dayLabel(at: Date, now: Date): string {
    const days = Math.round(
        (new Date(at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000
    );
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return dayFmt.format(at);
}

export default function AstrologerHome() {
    const [data, setData] = useState<Home | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ticks once a second so the countdowns move. The server still decides when
    // time is actually up; this only keeps the display from sitting still for
    // thirty seconds at a stretch.
    const [tick, setTick] = useState(() => Date.now());
    const [loadedAt, setLoadedAt] = useState(() => Date.now());

    // Which request has its "propose another time" form open, and what is in it.
    const [countering, setCountering] = useState<string | null>(null);
    const [counterAt, setCounterAt] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/astrologer/home');
            if (res.ok) {
                setData(await res.json());
                setLoadedAt(Date.now());
            }
        } catch {
            // Transient; the next poll is seconds away.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
        const id = setInterval(load, POLL_MS);
        return () => clearInterval(id);
    }, [load]);

    useEffect(() => {
        const id = setInterval(() => setTick(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const toggleDuty = async () => {
        if (!data) return;
        setToggling(true);
        setError(null);
        try {
            const res = await fetch('/api/astrologer/availability', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: !data.astrologer.isAvailable }),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.message ?? body.error ?? 'Could not change your duty state.');
                return;
            }
            setData({
                ...data,
                astrologer: { ...data.astrologer, isAvailable: body.isAvailable },
            });
        } catch {
            setError('Could not change your duty state. Check your connection.');
        } finally {
            setToggling(false);
        }
    };

    const act = async (id: string, action: 'ACCEPT' | 'COUNTER' | 'DECLINE') => {
        setBusyId(id);
        setError(null);
        setNotice(null);
        try {
            const res = await fetch(`/api/appointments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    // `datetime-local` has no zone, which is right here: the
                    // astrologer types their own wall clock and the browser
                    // resolves it against their zone.
                    ...(action === 'COUNTER'
                        ? { startAt: new Date(counterAt).toISOString() }
                        : {}),
                }),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.message ?? body.error ?? 'That did not go through.');
                return;
            }
            setNotice(body.message ?? 'Done.');
            setCountering(null);
            setCounterAt('');
            await load();
        } catch {
            setError('That did not go through. Check your connection.');
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <p className={styles.loading}>
                <Loader2 size={18} className={styles.spin} aria-hidden="true" /> Loading…
            </p>
        );
    }

    if (!data) {
        return (
            <div className={styles.gate}>
                <h2 className={styles.gateTitle}>Could not load your desk</h2>
                <p className={styles.gateDetail}>
                    Check your connection and reload. Sessions already open are unaffected.
                </p>
            </div>
        );
    }

    const a = data.astrologer;

    if (a.status !== 'APPROVED') {
        return (
            <div className={styles.gate}>
                <h2 className={styles.gateTitle}>
                    {a.status === 'PENDING'
                        ? 'Your application is under review'
                        : `Your profile is ${a.status.toLowerCase()}`}
                </h2>
                <p className={styles.gateDetail}>
                    You cannot take consultations until an admin approves your profile.
                </p>
            </div>
        );
    }

    const onDuty = a.isAvailable;
    const inSession = data.inSession ?? [];
    const waiting = data.waiting ?? [];
    const requests = data.requests ?? [];
    const upcoming = data.upcoming ?? [];
    const hours = data.hours ?? [];
    const today = data.today ?? { sessions: 0, minutes: 0, credits: 0 };
    const earnings = data.earnings ?? { unpaidPaise: 0, lastPayout: null };
    const blockSeconds = data.blockSeconds ?? 300;
    const blockMinutes = Math.round(blockSeconds / 60);

    // The countdown the server sent, less the time that has passed since.
    const elapsed = Math.floor((tick - loadedAt) / 1000);
    const remainingOf = (c: Live) => Math.max(0, c.remainingSeconds - elapsed);

    const now = new Date(tick);

    /** Nothing live, nobody waiting, nothing to answer. */
    const nothingDoing =
        inSession.length === 0 && waiting.length === 0 && requests.length === 0;

    return (
        <div className={styles.page} data-duty={onDuty ? 'on' : 'off'}>
            <div className={styles.strip}>
                <div className={styles.shell}>
                    {/* One account, two front doors. An astrologer is also a
                        seeker, and the way back has to be visible or this page
                        reads as a takeover. */}
                    <Link href="/dashboard" className={styles.asSeeker}>
                        View as seeker →
                    </Link>
                </div>
            </div>

            {/* ══ Duty ══ The one fact that should be readable across a room. */}
            <div className={styles.duty}>
                <div className={`${styles.shell} ${styles.dutyIn}`}>
                    <div className={styles.dutyState}>
                        <span className={styles.lamp} aria-hidden="true" />
                        <div>
                            <p className={styles.eyebrow}>{onDuty ? 'On duty' : 'Off duty'}</p>
                            <h1 className={styles.dutyTitle}>
                                {onDuty
                                    ? 'You are listed in the directory'
                                    : 'You are not listed'}
                            </h1>
                            <p className={styles.dutyDesc}>
                                {onDuty
                                    ? `Seekers can find you and start a session.${
                                          a.lastSeenAt
                                              ? ` Signed in at ${clockFmt.format(new Date(a.lastSeenAt))}.`
                                              : ''
                                      }`
                                    : 'Nobody can start a new session with you. Sessions already open are unaffected.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={onDuty ? styles.btnNight : styles.btnFill}
                        onClick={toggleDuty}
                        disabled={toggling}
                        aria-pressed={onDuty}
                    >
                        {toggling ? 'Saving…' : onDuty ? 'Go off duty' : 'Go on duty'}
                    </button>
                </div>
            </div>

            {(error || notice) && (
                <div className={styles.shell}>
                    <p
                        className={error ? styles.error : styles.notice}
                        role={error ? 'alert' : 'status'}
                    >
                        {error ?? notice}
                    </p>
                </div>
            )}

            {/* ══ The day, in four figures ══
                Directly under the duty band and across the full width, because
                these are the numbers glanced at rather than read — and because
                they are the only part of the page that is never empty. Buried
                in the narrow rail they were below the fold on a quiet day, and
                a quiet day is most days. */}
            <div className={styles.shell}>
                <div className={styles.figures}>
                    <div className={styles.figure}>
                        <b>{today.sessions}</b>
                        <span>Sessions today</span>
                    </div>
                    <div className={styles.figure}>
                        <b>{today.minutes}</b>
                        <span>Minutes today</span>
                    </div>
                    <div className={styles.figure}>
                        <b>{today.credits}</b>
                        <span>Credits today</span>
                    </div>
                    <div className={`${styles.figure} ${styles.figureMoney}`}>
                        <b>{rupees(earnings.unpaidPaise)}</b>
                        <span>Awaiting payout</span>
                    </div>
                </div>
            </div>

            <div className={`${styles.shell} ${styles.spread}`}>
                {/* ── THE WORK: what is in front of you right now ─────── */}
                <div className={styles.col}>
                    {/* Nothing live, nobody waiting, nothing to answer — which is
                        most of most days. Three separate "nothing here" cards
                        stacked down the widest column read as a broken page
                        rather than a quiet one, so the quiet case gets a single
                        calm statement instead. */}
                    {nothingDoing ? (
                        <section>
                            <div className={styles.head}>
                                <h2>Your desk</h2>
                                <span className={styles.rule} />
                            </div>
                            <div className={`${styles.card} ${styles.restful}`}>
                                <b>Nothing needs you right now</b>
                                <p>
                                    {onDuty
                                        ? 'You are listed in the directory. A seeker starting a session, or asking for a time, will appear here.'
                                        : 'You are off duty, so nobody can start a session with you. Go on duty to appear in the directory.'}
                                </p>
                                {hours.length === 0 && (
                                    <p className={styles.restfulHint}>
                                        You have published no hours, so nothing can be booked ahead
                                        either.{' '}
                                        <Link href="/astrologer/profile" className={styles.inlineLink}>
                                            Set your hours
                                        </Link>
                                        .
                                    </p>
                                )}
                            </div>
                        </section>
                    ) : (
                      <>
                    {inSession.length > 0 && (
                        <section>
                            <div className={styles.head}>
                                <h2>In session</h2>
                                <span className={styles.rule} />
                            </div>
                            {inSession.map((c) => (
                                <article key={c.id} className={`${styles.card} ${styles.live}`}>
                                    <div className={styles.liveTop}>
                                        <div>
                                            <p className={styles.liveWho}>{c.seeker}</p>
                                            <p className={styles.liveQ}>
                                                {c.kind.toLowerCase()} · {c.creditsCharged} credit
                                                {c.creditsCharged === 1 ? '' : 's'} so far
                                            </p>
                                        </div>
                                        <p className={styles.clock}>
                                            {c.expired || remainingOf(c) === 0
                                                ? '0:00'
                                                : mmss(remainingOf(c))}
                                            <small>Left in block</small>
                                        </p>
                                    </div>
                                    <div className={styles.meter} aria-hidden="true">
                                        <i
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    (remainingOf(c) / (c.blockSeconds || blockSeconds)) * 100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                    <div className={styles.liveAct}>
                                        <Link href={`/consult/${c.id}`} className={styles.btnFill}>
                                            Open chat
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}

                    <section>
                        <div className={styles.head}>
                            <h2>Waiting</h2>
                            <span className={styles.count}>
                                {waiting.length === 0
                                    ? 'none'
                                    : `${waiting.length} seeker${waiting.length === 1 ? '' : 's'}`}
                            </span>
                            <span className={styles.rule} />
                        </div>
                        {waiting.length === 0 ? (
                            <div className={`${styles.card} ${styles.empty}`}>
                                <b>Nobody is waiting</b>
                                {onDuty
                                    ? 'You are listed. Seekers can start a session with you now.'
                                    : 'Go on duty to appear in the directory.'}
                            </div>
                        ) : (
                            <div className={`${styles.card} ${styles.queue}`}>
                                {waiting.map((c) => (
                                    <Link key={c.id} href={`/consult/${c.id}`} className={styles.q}>
                                        <AstrologerAvatar
                                            name={c.seeker}
                                            photoUrl={c.seekerImage}
                                            size={38}
                                        />
                                        <span className={styles.qBody}>
                                            <span className={styles.qName}>{c.seeker}</span>
                                            <span className={styles.qMeta}>
                                                {c.kind.toLowerCase()} · not answered yet
                                            </span>
                                        </span>
                                        <span className={styles.qWait}>
                                            <b>{since(c.startedAt, tick)}</b>waiting
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className={styles.head}>
                            <h2>Appointment requests</h2>
                            {requests.length > 0 && (
                                <span className={styles.count}>
                                    {requests.length} awaiting your answer
                                </span>
                            )}
                            <span className={styles.rule} />
                        </div>
                        {requests.length === 0 ? (
                            <div className={`${styles.card} ${styles.empty}`}>
                                <b>Nothing to answer</b>
                                {hours.length === 0 ? (
                                    <>
                                        You have published no hours, so nothing can be booked.{' '}
                                        <Link href="/astrologer/profile" className={styles.inlineLink}>
                                            Set your hours
                                        </Link>{' '}
                                        to start taking appointments.
                                    </>
                                ) : (
                                    'Seekers can only request times inside the hours you have published.'
                                )}
                            </div>
                        ) : (
                            <div className={styles.card}>
                                {requests.map((r) => {
                                    const at = new Date(r.startAt);
                                    return (
                                        <article key={r.id} className={styles.req}>
                                            <div className={styles.reqTop}>
                                                <AstrologerAvatar
                                                    name={r.seeker}
                                                    photoUrl={r.seekerImage}
                                                    size={38}
                                                />
                                                <div className={styles.reqBody}>
                                                    <p className={styles.reqName}>{r.seeker}</p>
                                                    <p className={styles.reqMeta}>
                                                        {r.blocks} block{r.blocks === 1 ? '' : 's'} (
                                                        {r.blocks * blockMinutes} min) · {r.ref}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={styles.slot}>
                                                <b>
                                                    {dayLabel(at, now)} · {timeFmt.format(at)}
                                                </b>
                                                <span>your local time</span>
                                            </div>

                                            {countering === r.id ? (
                                                <div className={styles.counter}>
                                                    <label className={styles.counterLabel}>
                                                        A time that suits you better
                                                        <input
                                                            type="datetime-local"
                                                            className={styles.counterInput}
                                                            value={counterAt}
                                                            onChange={(e) =>
                                                                setCounterAt(e.target.value)
                                                            }
                                                        />
                                                    </label>
                                                    <p className={styles.counterHint}>
                                                        At least two hours from now. Nothing is
                                                        charged until the seeker takes it.
                                                    </p>
                                                    <div className={styles.reqAct}>
                                                        <button
                                                            type="button"
                                                            className={`${styles.btnFill} ${styles.btnSm}`}
                                                            disabled={!counterAt || busyId === r.id}
                                                            onClick={() => act(r.id, 'COUNTER')}
                                                        >
                                                            {busyId === r.id ? 'Sending…' : 'Send'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`${styles.btnQuiet} ${styles.btnSm}`}
                                                            onClick={() => setCountering(null)}
                                                        >
                                                            Back
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.reqAct}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnFill} ${styles.btnSm}`}
                                                        disabled={busyId === r.id}
                                                        onClick={() => act(r.id, 'ACCEPT')}
                                                    >
                                                        {busyId === r.id ? 'Working…' : 'Accept'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnQuiet} ${styles.btnSm}`}
                                                        onClick={() => {
                                                            setCountering(r.id);
                                                            setCounterAt('');
                                                        }}
                                                    >
                                                        Propose another time
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnQuiet} ${styles.btnSm}`}
                                                        disabled={busyId === r.id}
                                                        onClick={() => act(r.id, 'DECLINE')}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                        <p className={styles.note}>
                            <b>Nothing is charged when a request is made.</b> Credits leave the
                            seeker the moment you accept, which is when your time stops being
                            sellable to anyone else.
                        </p>
                    </section>
                      </>
                    )}
                </div>

                {/* ── THE LEDGER: your diary, your money, your practice ─ */}
                <div className={styles.col}>
                    <section>
                        <div className={styles.head}>
                            <h2>Upcoming</h2>
                            <span className={styles.rule} />
                        </div>
                        {upcoming.length === 0 ? (
                            <div className={`${styles.card} ${styles.empty}`}>
                                <b>Nothing booked</b>
                                Confirmed appointments appear here.
                            </div>
                        ) : (
                            <div className={`${styles.card} ${styles.up}`}>
                                {upcoming.map((u) => {
                                    const at = new Date(u.startAt);
                                    return (
                                        <div key={u.id} className={styles.upRow}>
                                            <span className={styles.upDate}>
                                                {timeFmt.format(at)}
                                                <small>{dayLabel(at, now)}</small>
                                            </span>
                                            <span className={styles.upName}>
                                                {u.seeker}
                                                <small>
                                                    {u.blocks} block{u.blocks === 1 ? '' : 's'}
                                                    {u.status === 'COUNTERED'
                                                        ? ' · awaiting their answer'
                                                        : ''}
                                                </small>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>


                    <section>
                        <div className={styles.head}>
                            <h2>Earnings</h2>
                            <span className={styles.rule} />
                        </div>
                        <div className={`${styles.card} ${styles.money}`}>
                            <div className={styles.moneyRow}>
                                <span className={styles.moneyKey}>Unpaid balance</span>
                                <span className={styles.moneyVal}>
                                    {rupees(earnings.unpaidPaise)}
                                </span>
                            </div>
                            {earnings.lastPayout && (
                                <div className={styles.moneyRow}>
                                    <span className={styles.moneyKey}>
                                        Last payout
                                        {earnings.lastPayout.paidAt
                                            ? ` · ${dayFmt.format(new Date(earnings.lastPayout.paidAt))}`
                                            : ''}
                                    </span>
                                    <span className={`${styles.moneyVal} ${styles.moneySmall}`}>
                                        {rupees(earnings.lastPayout.amountPaise)}
                                    </span>
                                </div>
                            )}
                            <p className={styles.moneyNote}>
                                Settled per session at your agreed share. Rates are snapshotted
                                when a session opens, so a later change never rewrites what you
                                have earned.
                            </p>
                        </div>
                    </section>
                    <section>
                        <div className={styles.head}>
                            <h2>Your hours</h2>
                            <span className={styles.rule} />
                        </div>
                        {hours.length === 0 ? (
                            <div className={`${styles.card} ${styles.empty}`}>
                                <b>No hours published</b>
                                Nobody can book you ahead. Walk-in sessions still work whenever
                                you are on duty.
                                <span className={styles.emptyAct}>
                                    <Link href="/astrologer/profile" className={styles.btnQuiet}>
                                        Set your hours
                                    </Link>
                                </span>
                            </div>
                        ) : (
                            <div className={`${styles.card} ${styles.up}`}>
                                {hours.map((h, i) => (
                                    <div key={i} className={styles.upRow}>
                                        <span className={styles.upDate}>
                                            {DAY_NAMES[h.dayOfWeek]}
                                        </span>
                                        <span className={styles.upName}>
                                            {hhmm(h.startMinute)} – {hhmm(h.endMinute)}
                                            <small>{h.timezone}</small>
                                        </span>
                                    </div>
                                ))}
                                <div className={styles.upFoot}>
                                    <Link href="/astrologer/profile" className={styles.btnQuiet}>
                                        Edit hours
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className={styles.head}>
                            <h2>Your profile</h2>
                            <span className={styles.rule} />
                        </div>
                        <div className={`${styles.card} ${styles.prof}`}>
                            <div className={styles.profTop}>
                                <AstrologerAvatar
                                    name={a.displayName}
                                    photoUrl={a.photoUrl}
                                    size={56}
                                />
                                <div>
                                    <p className={styles.profName}>{a.displayName}</p>
                                    <p className={styles.profSub}>
                                        {a.languages.join(' · ') || 'No languages listed'}
                                        {'  ·  '}
                                        {a.creditsPerBlock} credit
                                        {a.creditsPerBlock === 1 ? '' : 's'} / block
                                    </p>
                                </div>
                            </div>
                            {a.specialities.length > 0 && (
                                <div className={styles.tags}>
                                    {a.specialities.map((s) => (
                                        <span key={s} className={styles.tag}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className={styles.profFoot}>
                                <span className={styles.profHint}>This is what seekers see.</span>
                                <Link href="/astrologer/profile" className={styles.btnQuiet}>
                                    Edit
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
