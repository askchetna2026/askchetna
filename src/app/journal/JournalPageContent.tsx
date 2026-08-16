'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import JournalWidget from '@/components/JournalWidget';
import { localDay } from '@/lib/localDay';
import styles from './page.module.css';

type Entry = {
    id: string;
    date: string;
    content: string;
    /** Resolved server-side when the entry was written. Null on older entries. */
    transit?: { dashaLord?: string | null; antardashaLord?: string | null } | null;
};

const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

export default function JournalPageContent() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const [entries, setEntries] = useState<Entry[] | null>(null);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        (async () => {
            try {
                // 20 is the route's own ceiling. Paging can come when someone
                // actually has more than twenty entries to page through.
                const res = await fetch('/api/journal?limit=20');
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setEntries(data.entries ?? []);
            } catch (err) {
                console.error('Failed to load journal history:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const today = localDay();
    // Today's entry is the one in the composer above; repeating it below would
    // read as a duplicate rather than a record.
    const past = (entries ?? []).filter((e) => e.date !== today && e.content.trim());

    if (status === 'unauthenticated') {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <span className="cosmic-label">Dainandini · Daily Reflection</span>
                    <h1 className="mystic-text">Your Journal</h1>
                    <div className="sacred-divider"></div>
                    <p className={styles.lede}>
                        Sign in to keep your reflections, and to read them back over weeks
                        rather than days.
                    </p>
                    <Link href="/login" className="primary-btn-cosmic">
                        Sign in
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <span className="cosmic-label">Dainandini · Daily Reflection</span>
                <h1 className="mystic-text">Your Journal</h1>
                <div className="sacred-divider"></div>
                <p className={styles.lede}>
                    Write what you noticed today. The value is not in any single entry —
                    it is in what you can see when a month of them sits together.
                </p>

                <JournalWidget />

                <section className={styles.history}>
                    <h2 className={styles.historyTitle}>Earlier entries</h2>

                    {entries === null && <p className={styles.empty}>Loading your reflections…</p>}

                    {entries !== null && past.length === 0 && (
                        <p className={styles.empty}>
                            Nothing here yet. Today&apos;s reflection above will be the first.
                        </p>
                    )}

                    {past.map((entry) => (
                        <article key={entry.id} className={styles.entry}>
                            <h3 className={styles.entryDate}>{longDate(entry.date)}</h3>
                            {/* What was running when this was written. The
                                point of keeping it: by the time someone wants
                                to ask which period they kept writing this in,
                                the dasha has moved on and the answer is no
                                longer recoverable from the entry. Absent on
                                anything written before the column was filled. */}
                            {entry.transit?.dashaLord && (
                                <p className={styles.entryContext}>
                                    {entry.transit.dashaLord}
                                    {entry.transit.antardashaLord
                                        ? ` · ${entry.transit.antardashaLord} sub-period`
                                        : ''}
                                </p>
                            )}
                            <p className={styles.entryBody}>{entry.content}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
