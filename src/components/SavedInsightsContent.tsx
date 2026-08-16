'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2, Trash2 } from 'lucide-react';
import styles from './SavedInsightsContent.module.css';

interface SavedInsight {
    id: string;
    source: string;
    href: string | null;
    title: string;
    body: string;
    context?: { dashaLord?: string | null; antardashaLord?: string | null } | null;
    createdAt: string;
}

/** Where each one came from, in words a reader recognises. */
const SOURCE_LABEL: Record<string, string> = {
    clarity: 'Ask Chetna',
    patterns: 'Patterns',
    timing: 'Timing',
    chart: 'Chart',
    consultation: 'Consultation',
};

const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Readings someone chose to keep.
 *
 * Each carries the dasha that was running when it was kept, which is the point
 * of keeping them: a reading about a Saturn period is a different thing read
 * during that period and read four years later, and without the label the
 * second reader has no way to tell which they are doing.
 */
export default function SavedInsightsContent() {
    const { status } = useSession();
    const [insights, setInsights] = useState<SavedInsight[] | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated') return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/insights');
                if (!res.ok) {
                    if (!cancelled) setFailed(true);
                    return;
                }
                const data = await res.json();
                if (!cancelled) setInsights(data.insights ?? []);
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [status]);

    const remove = async (id: string) => {
        if (removing) return;
        setRemoving(id);
        try {
            const res = await fetch(`/api/insights/${id}`, { method: 'DELETE' });
            if (res.ok) setInsights((prev) => (prev ?? []).filter((i) => i.id !== id));
        } catch {
            // Leaving it in the list is the honest failure: it is still there.
        } finally {
            setRemoving(null);
        }
    };

    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Sangraha · Kept</p>
                <h1 className="mystic-text">Saved insights</h1>
                <p className={styles.standfirst}>
                    Readings you chose to keep, each with the period it belonged to.
                </p>
            </header>

            {status === 'loading' && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Loading…
                </p>
            )}

            {status === 'unauthenticated' && (
                <div className={styles.gate}>
                    <p>Sign in to see what you have kept.</p>
                    <Link href="/login" className={styles.gateBtn}>
                        Sign in
                    </Link>
                </div>
            )}

            {failed && (
                <p className={styles.state}>Could not load these just now. Please refresh.</p>
            )}

            {status === 'authenticated' && !insights && !failed && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Loading…
                </p>
            )}

            {insights?.length === 0 && (
                <div className={styles.empty}>
                    <p>
                        Nothing kept yet. Anything you want to come back to — a reading, a
                        pattern — can be saved from where you found it.
                    </p>
                    <Link href="/clarity" className={styles.gateBtn}>
                        Ask Chetna a question
                    </Link>
                </div>
            )}

            {insights && insights.length > 0 && (
                <ul className={styles.list}>
                    {insights.map((insight) => (
                        <li key={insight.id} className={styles.card}>
                            <div className={styles.cardHead}>
                                <div className={styles.meta}>
                                    <span className={styles.source}>
                                        {SOURCE_LABEL[insight.source] ?? insight.source}
                                    </span>
                                    <time dateTime={insight.createdAt}>
                                        {longDate(insight.createdAt)}
                                    </time>
                                    {/* The period it belonged to. Absent on
                                        anything saved before the context was
                                        recorded, rather than shown blank. */}
                                    {insight.context?.dashaLord && (
                                        <span className={styles.context}>
                                            {insight.context.dashaLord}
                                            {insight.context.antardashaLord
                                                ? ` · ${insight.context.antardashaLord}`
                                                : ''}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className={styles.remove}
                                    onClick={() => remove(insight.id)}
                                    disabled={removing === insight.id}
                                    aria-label={`Remove “${insight.title}”`}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <h2 className={styles.title}>{insight.title}</h2>
                            <p className={styles.body}>{insight.body}</p>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
