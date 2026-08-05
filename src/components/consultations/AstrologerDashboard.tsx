'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Radio } from 'lucide-react';
import styles from './AstrologerDashboard.module.css';

/**
 * The astrologer's own screen: go online, see who has arrived, review earnings.
 *
 * Presence is NOT maintained here any more. Sign-in sets availability and
 * sign-out clears it (see the auth events), so this page no longer has to prove
 * liveness with a repeating write. The old 45s heartbeat cost a function call
 * and a row write roughly 640 times a day per astrologer for a value that
 * changes twice.
 *
 * The session poll stays, because an incoming consultation has to appear
 * without a refresh — but at 8s it was 450 requests an hour from a single open
 * tab, which is the largest single consumer of the free tier in the app. 30s is
 * still well inside the window in which someone is deciding whether to wait.
 */

const POLL_MS = 30_000;

type Live = {
    id: string;
    kind: string;
    seeker: string;
    remainingSeconds: number;
    expired: boolean;
    creditsCharged: number;
};

type Recent = {
    id: string;
    kind: string;
    status: string;
    endedAt: string | null;
    durationSeconds: number;
    creditsCharged: number;
    earnedPaise: number;
};

type Summary = {
    sessionsServed: number;
    creditsServed: number;
    earnedPaise: number;
    paidPaise: number;
    unpaidPaise: number;
};

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
const mmss = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

export default function AstrologerDashboard() {
    const [available, setAvailable] = useState(false);
    const [status, setStatus] = useState<string>('PENDING');
    const [live, setLive] = useState<Live | null>(null);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [sessionsRes, earningsRes] = await Promise.all([
                fetch('/api/astrologer/sessions'),
                fetch('/api/astrologer/earnings'),
            ]);

            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                setAvailable(data.astrologer.isAvailable);
                setStatus(data.astrologer.status);
                setLive(data.live);
                setRecent(data.recent ?? []);
            }
            if (earningsRes.ok) {
                const data = await earningsRes.json();
                setSummary(data.summary);
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

    const toggle = async () => {
        setToggling(true);
        setError(null);
        try {
            const res = await fetch('/api/astrologer/availability', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: !available }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? data.error ?? 'Could not change availability.');
                return;
            }
            setAvailable(data.isAvailable);
        } catch {
            setError('Could not change availability. Check your connection.');
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return (
            <p className={styles.loading}>
                <Loader2 size={18} className={styles.spin} /> Loading…
            </p>
        );
    }

    if (status !== 'APPROVED') {
        return (
            <div className={styles.gate}>
                <h2 className={styles.gateTitle}>
                    {status === 'PENDING'
                        ? 'Your application is under review'
                        : `Your profile is ${status.toLowerCase()}`}
                </h2>
                <p className={styles.gateDetail}>
                    You cannot take consultations until an admin approves your profile.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <section className={`${styles.panel} ${available ? styles.panelLive : ''}`}>
                <div className={styles.availRow}>
                    <div>
                        <p className={styles.availLabel}>
                            <Radio size={15} aria-hidden="true" />
                            {available ? 'You are available' : 'You are offline'}
                        </p>
                        <p className={styles.availHint}>
                            {available
                                ? 'You appear in the directory while this page stays open.'
                                : 'Seekers cannot reach you while you are offline.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={available ? styles.goOffline : styles.goOnline}
                        onClick={toggle}
                        disabled={toggling}
                        aria-pressed={available}
                    >
                        {toggling ? 'Saving…' : available ? 'Go offline' : 'Go available'}
                    </button>
                </div>

                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}
            </section>

            {live && (
                <section className={styles.liveCard} role="status">
                    <div>
                        <p className={styles.liveTitle}>
                            {live.seeker} is waiting — {live.kind.toLowerCase()}
                        </p>
                        <p className={styles.liveMeta}>
                            {live.expired
                                ? 'Time has run out'
                                : `${mmss(live.remainingSeconds)} left · ${live.creditsCharged} credit${live.creditsCharged === 1 ? '' : 's'} so far`}
                        </p>
                    </div>
                    <Link href={`/consult/${live.id}`} className={styles.join}>
                        Open conversation
                    </Link>
                </section>
            )}

            {summary && (
                <section className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Sessions</span>
                        <span className={styles.statValue}>{summary.sessionsServed}</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Credits served</span>
                        <span className={styles.statValue}>{summary.creditsServed}</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Earned</span>
                        <span className={styles.statValue}>{rupees(summary.earnedPaise)}</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Paid</span>
                        <span className={styles.statValue}>{rupees(summary.paidPaise)}</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Awaiting payout</span>
                        <span className={styles.statValue}>{rupees(summary.unpaidPaise)}</span>
                    </div>
                </section>
            )}

            <section>
                <h2 className={styles.heading}>Recent consultations</h2>
                {recent.length === 0 ? (
                    <p className={styles.empty}>Nothing yet.</p>
                ) : (
                    <ul className={styles.recent}>
                        {recent.map((c) => (
                            <li key={c.id} className={styles.recentRow}>
                                <span className={styles.recentKind}>{c.kind.toLowerCase()}</span>
                                <span className={styles.recentTime}>
                                    {mmss(c.durationSeconds)} · {c.creditsCharged} credit
                                    {c.creditsCharged === 1 ? '' : 's'}
                                </span>
                                <span className={styles.recentAmount}>
                                    {rupees(c.earnedPaise)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
