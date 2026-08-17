'use client';

import { useEffect, useState } from 'react';
import styles from './AdminCreditGrant.module.css';

/**
 * Give credits to somebody who did not ask.
 *
 * The request queue beside this covers the seeker-initiated case. This covers
 * the rest: an apology for a session that broke, a gift to an early tester, a
 * correction after a payment that half-worked. Until now the only way to do
 * that was editing rows in Supabase, which produces a balance no report can
 * explain.
 *
 * The grant list below the form is not decoration — it is the feature. A credit
 * that appears in someone's balance with no record of who added it or why is
 * indistinguishable from a bug in the payment webhook, and that is exactly the
 * question somebody will be asking six months from now.
 */

export interface GrantableUser {
    id: string;
    name: string;
    email: string;
    credits: number;
}

interface Grant {
    id: string;
    userName: string | null;
    userEmail: string | null;
    credits: number;
    reason: string | null;
    grantedBy: string | null;
    createdAt: string;
}

export default function AdminCreditGrant({
    users,
    onGranted,
}: {
    users: GrantableUser[];
    /** Lets the parent refresh its own user list, so balances stay honest. */
    onGranted?: () => void;
}) {
    const [userId, setUserId] = useState('');
    const [credits, setCredits] = useState('5');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [loadingGrants, setLoadingGrants] = useState(true);

    const loadGrants = async () => {
        try {
            const res = await fetch('/api/admin/credits/grant');
            if (!res.ok) return;
            const data = await res.json();
            setGrants(Array.isArray(data.grants) ? data.grants : []);
        } catch {
            // The form still works without the history; no second error to show.
        } finally {
            setLoadingGrants(false);
        }
    };

    useEffect(() => {
        void loadGrants();
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/credits/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, credits: Number(credits), reason }),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage({ kind: 'bad', text: data.error ?? 'Could not record that grant.' });
                return;
            }

            setMessage({ kind: 'ok', text: data.message });
            setReason('');
            setUserId('');
            await loadGrants();
            onGranted?.();
        } catch {
            setMessage({ kind: 'bad', text: 'Could not reach the server.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={styles.wrap}>
            <header className={styles.head}>
                <h3 className={styles.title}>Give credits directly</h3>
                <p className={styles.sub}>
                    For when nobody filed a request. Every grant is recorded below with who
                    made it and why.
                </p>
            </header>

            <form className={styles.form} onSubmit={submit}>
                <div className={styles.field}>
                    <label htmlFor="grant-user">Who</label>
                    <select
                        id="grant-user"
                        className={styles.control}
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required
                    >
                        <option value="">Choose a user…</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name || u.email} · {u.credits} now
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.fieldNarrow}>
                    <label htmlFor="grant-credits">How many</label>
                    <input
                        id="grant-credits"
                        className={styles.control}
                        type="number"
                        min={1}
                        max={500}
                        step={1}
                        value={credits}
                        onChange={(e) => setCredits(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.fieldWide}>
                    <label htmlFor="grant-reason">Why</label>
                    <input
                        id="grant-reason"
                        className={styles.control}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Refund for the session that dropped on 14 Aug"
                        maxLength={500}
                        required
                    />
                </div>

                <button type="submit" className={styles.submit} disabled={saving || !userId}>
                    {saving ? 'Recording…' : 'Give credits'}
                </button>
            </form>

            {message && (
                <p className={message.kind === 'ok' ? styles.ok : styles.bad} role="status">
                    {message.text}
                </p>
            )}

            <div className={styles.historyHead}>
                <h4 className={styles.historyTitle}>Recent direct grants</h4>
                <span className={styles.count}>{grants.length}</span>
            </div>

            {loadingGrants ? (
                <p className={styles.empty}>Loading…</p>
            ) : grants.length === 0 ? (
                <p className={styles.empty}>None yet. Grants made here will be listed.</p>
            ) : (
                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Credits</th>
                                <th>Reason</th>
                                <th>By</th>
                                <th>When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grants.map((g) => (
                                <tr key={g.id}>
                                    <td>{g.userName || g.userEmail || '—'}</td>
                                    <td className={styles.num}>+{g.credits}</td>
                                    <td>{g.reason || '—'}</td>
                                    <td>{g.grantedBy || '—'}</td>
                                    <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
