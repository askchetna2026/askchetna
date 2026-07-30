'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, Pause, Coins, Bot } from 'lucide-react';
import styles from './AdminAstrologerReview.module.css';

/**
 * The approval queue.
 *
 * Approval is the gate that keeps unvetted people out of one-to-one
 * consultations, so the screen shows what an admin actually needs to decide —
 * who they are, how to reach them, what they claim to work with — rather than a
 * row of names and a button.
 *
 * Rejection and suspension require a reason. It is stored on the record and
 * shown back to the astrologer, so "why was I turned down" has an answer that
 * does not depend on someone remembering.
 */

type Astrologer = {
    id: string;
    displayName: string;
    bio: string | null;
    status: string;
    languages: string[];
    specialities: string[];
    revenueSharePct: number | null;
    /** Credits per block. Null follows the global default of 1. */
    creditsPerBlock: number | null;
    isAI: boolean;
    aiSystemPrompt: string | null;
    isAvailable: boolean;
    createdAt: string;
    rejectionReason: string | null;
    /** Null for an AI persona — there is no account behind one. */
    user: { email: string; phone: string | null } | null;
    creditsServed: number;
    earnedPaise: number;
    unpaidPaise: number;
};

const TABS = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'ALL'] as const;

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

export default function AdminAstrologerReview() {
    const [tab, setTab] = useState<(typeof TABS)[number]>('PENDING');
    const [astrologers, setAstrologers] = useState<Astrologer[] | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setAstrologers(null);
        try {
            const res = await fetch(`/api/admin/astrologers?status=${tab}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setAstrologers(data.astrologers ?? []);
            setCounts(data.counts ?? {});
        } catch {
            setAstrologers([]);
            setError('Could not load astrologers.');
        }
    }, [tab]);

    useEffect(() => {
        void load();
    }, [load]);

    const update = async (
        id: string,
        body: Record<string, unknown>,
        confirmMessage?: string
    ) => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        setBusy(id);
        setError(null);
        try {
            const res = await fetch(`/api/admin/astrologers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? 'Update failed.');
                return;
            }
            await load();
        } catch {
            setError('Update failed. Check your connection.');
        } finally {
            setBusy(null);
        }
    };

    const reject = (id: string, name: string) => {
        const reason = window.prompt(`Why is ${name}'s application being rejected?`);
        if (reason === null) return;
        void update(id, { status: 'REJECTED', rejectionReason: reason });
    };

    const suspend = (id: string, name: string) => {
        const reason = window.prompt(`Why is ${name} being suspended?`);
        if (reason === null) return;
        void update(id, { status: 'SUSPENDED', rejectionReason: reason });
    };

    const setShare = (id: string, current: number | null) => {
        const raw = window.prompt(
            'Revenue share for this astrologer, as a whole percentage. Leave blank to follow the global default.',
            current === null ? '' : String(current)
        );
        if (raw === null) return;
        const trimmed = raw.trim();
        if (trimmed === '') {
            void update(id, { revenueSharePct: null });
            return;
        }
        const pct = Number(trimmed);
        if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
            setError('Revenue share must be a whole number between 0 and 100.');
            return;
        }
        void update(id, { revenueSharePct: pct });
    };

    /**
     * What one block of this astrologer's time costs the seeker.
     *
     * Applies to future sessions only — a consultation snapshots the rate when
     * it opens, so this cannot change what a running or settled session charged.
     */
    const setPrice = (id: string, current: number | null) => {
        const raw = window.prompt(
            'Credits charged per block for this astrologer. Leave blank to follow the global default of 1.\n\nApplies to NEW sessions only.',
            current === null ? '' : String(current)
        );
        if (raw === null) return;
        const trimmed = raw.trim();
        if (trimmed === '') {
            void update(id, { creditsPerBlock: null });
            return;
        }
        const credits = Number(trimmed);
        if (!Number.isInteger(credits) || credits < 1 || credits > 100) {
            setError('Price must be a whole number of credits between 1 and 100.');
            return;
        }
        void update(id, { creditsPerBlock: credits });
    };

    /** Persona text for an AI astrologer. Editable so tuning needs no deploy. */
    const setPersona = (id: string, current: string | null) => {
        const raw = window.prompt(
            'Persona and instructions for this AI astrologer.\n\nHouse rules (no fixed predictions, no medical/legal/financial instruction, never claim to be human) are enforced separately and cannot be removed here.',
            current ?? ''
        );
        if (raw === null) return;
        void update(id, { aiSystemPrompt: raw });
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.tabs} role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        className={`${styles.tab} ${tab === t ? styles.tabOn : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                        {counts[t] !== undefined && (
                            <span className={styles.count}>{counts[t]}</span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}

            {astrologers === null && (
                <p className={styles.loading}>
                    <Loader2 size={16} className={styles.spin} /> Loading…
                </p>
            )}

            {astrologers?.length === 0 && (
                <p className={styles.empty}>Nothing here.</p>
            )}

            <div className={styles.list}>
                {astrologers?.map((a) => (
                    <article key={a.id} className={styles.card}>
                        <div className={styles.head}>
                            <div>
                                <h3 className={styles.name}>
                                    {a.displayName}
                                    {a.isAI && <span className={styles.aiTag}>AI</span>}
                                </h3>
                                {/* An AI persona has no account, so user is null
                                    here — reading .email off it crashed the list. */}
                                <p className={styles.contact}>
                                    {a.isAI
                                        ? 'AI persona · no account'
                                        : a.user
                                          ? `${a.user.email}${a.user.phone ? ` · ${a.user.phone}` : ''}`
                                          : 'No account on file'}
                                </p>
                            </div>
                            <span className={`${styles.badge} ${styles[a.status.toLowerCase()] ?? ''}`}>
                                {a.status}
                            </span>
                        </div>

                        {a.bio && <p className={styles.bio}>{a.bio}</p>}

                        <dl className={styles.facts}>
                            <div>
                                <dt>Languages</dt>
                                <dd>{a.languages.join(', ') || '—'}</dd>
                            </div>
                            <div>
                                <dt>Works with</dt>
                                <dd>{a.specialities.join(', ') || '—'}</dd>
                            </div>
                            <div>
                                <dt>Price</dt>
                                <dd>
                                    {a.creditsPerBlock === null
                                        ? 'Global default (1 credit/block)'
                                        : `${a.creditsPerBlock} credit${a.creditsPerBlock === 1 ? '' : 's'}/block`}
                                </dd>
                            </div>
                            <div>
                                <dt>Revenue share</dt>
                                <dd>
                                    {/* Meaningless for an AI persona: there is
                                        nobody to pay, so no earning is written. */}
                                    {a.isAI
                                        ? 'n/a — platform revenue'
                                        : a.revenueSharePct === null
                                          ? 'Global default'
                                          : `${a.revenueSharePct}%`}
                                </dd>
                            </div>
                            <div>
                                <dt>Credits served</dt>
                                <dd>{a.creditsServed}</dd>
                            </div>
                            <div>
                                <dt>Earned</dt>
                                <dd>{rupees(a.earnedPaise)}</dd>
                            </div>
                            <div>
                                <dt>Unpaid</dt>
                                <dd>{rupees(a.unpaidPaise)}</dd>
                            </div>
                        </dl>

                        {a.rejectionReason && (
                            <p className={styles.reason}>Reason on record: {a.rejectionReason}</p>
                        )}

                        <div className={styles.actions}>
                            <button
                                className={styles.secondary}
                                disabled={busy === a.id}
                                onClick={() => setPrice(a.id, a.creditsPerBlock)}
                            >
                                <Coins size={15} /> Set price
                            </button>
                            {a.isAI && (
                                <button
                                    className={styles.secondary}
                                    disabled={busy === a.id}
                                    onClick={() => setPersona(a.id, a.aiSystemPrompt)}
                                >
                                    <Bot size={15} /> Edit persona
                                </button>
                            )}
                            {a.status !== 'APPROVED' && (
                                <button
                                    className={styles.approve}
                                    disabled={busy === a.id}
                                    onClick={() =>
                                        update(
                                            a.id,
                                            { status: 'APPROVED' },
                                            `Approve ${a.displayName}? They will be able to take consultations.`
                                        )
                                    }
                                >
                                    <Check size={15} /> Approve
                                </button>
                            )}
                            {a.status === 'APPROVED' && (
                                <button
                                    className={styles.suspend}
                                    disabled={busy === a.id}
                                    onClick={() => suspend(a.id, a.displayName)}
                                >
                                    <Pause size={15} /> Suspend
                                </button>
                            )}
                            {a.status === 'PENDING' && (
                                <button
                                    className={styles.reject}
                                    disabled={busy === a.id}
                                    onClick={() => reject(a.id, a.displayName)}
                                >
                                    <X size={15} /> Reject
                                </button>
                            )}
                            <button
                                className={styles.secondary}
                                disabled={busy === a.id}
                                onClick={() => setShare(a.id, a.revenueSharePct)}
                            >
                                Set revenue share
                            </button>
                        </div>

                        {/* Rate changes bind to future sessions only — each
                            consultation snapshots the share when it opens. */}
                        <p className={styles.footnote}>
                            Changing the share affects future consultations only. Sessions
                            already settled keep the figure they were paid on.
                        </p>
                    </article>
                ))}
            </div>
        </div>
    );
}
