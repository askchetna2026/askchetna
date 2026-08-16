'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './NotificationPreferences.module.css';

type Key = 'periodChange' | 'appointments' | 'dailyGuidance';

interface Prefs {
    periodChange: boolean;
    appointments: boolean;
    dailyGuidance: boolean;
}

/**
 * Written as what arrives, not as what the system sends.
 *
 * "Period change notifications" describes a database column; "when one of your
 * planetary periods is about to turn over" describes the thing that shows up on
 * someone's phone. The second is what a person is actually agreeing to.
 */
const ROWS: { key: Key; label: string; blurb: string }[] = [
    {
        key: 'periodChange',
        label: 'When a period is about to turn over',
        blurb:
            'A few days before a mahadasha or sub-period ends. This happens a handful of times a decade, and there is no other way to know it is coming.',
    },
    {
        key: 'appointments',
        label: 'Reminders for readings you have booked',
        blurb: 'The day before, and an hour before.',
    },
    {
        key: 'dailyGuidance',
        label: 'When your daily note is ready',
        blurb: 'Every morning. Off unless you ask for it.',
    },
];

export default function NotificationPreferences() {
    const [prefs, setPrefs] = useState<Prefs | null>(null);
    const [saving, setSaving] = useState<Key | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/notifications/preferences');
                if (!res.ok) {
                    if (!cancelled) setFailed(true);
                    return;
                }
                const data = await res.json();
                if (!cancelled) setPrefs(data.preferences);
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const toggle = async (key: Key) => {
        if (!prefs || saving) return;
        const next = !prefs[key];

        // Optimistic, then reconciled. A switch that waits on a round trip
        // before moving feels broken, and this is a preference — the cost of
        // being briefly wrong is nil.
        setPrefs({ ...prefs, [key]: next });
        setSaving(key);

        try {
            const res = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: next }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setPrefs(data.preferences);
        } catch {
            setPrefs((p) => (p ? { ...p, [key]: !next } : p));
            setFailed(true);
        } finally {
            setSaving(null);
        }
    };

    if (failed && !prefs) {
        return <p className={styles.state}>Could not load your notification settings.</p>;
    }

    if (!prefs) {
        return (
            <p className={styles.state}>
                <Loader2 size={15} className="animate-spin" /> Loading…
            </p>
        );
    }

    return (
        <div className={styles.wrap}>
            <ul className={styles.list}>
                {ROWS.map((row) => (
                    <li key={row.key} className={styles.row}>
                        <label className={styles.label}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={prefs[row.key]}
                                onChange={() => toggle(row.key)}
                                disabled={saving === row.key}
                            />
                            <span className={styles.text}>
                                <span className={styles.rowLabel}>{row.label}</span>
                                <span className={styles.rowBlurb}>{row.blurb}</span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>

            <p className={styles.note}>
                These only reach a device you have signed in on and allowed notifications for.
                Nothing here is marketing, and none of it is sent more than once.
            </p>
        </div>
    );
}
