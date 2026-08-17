'use client';

import { useEffect, useState } from 'react';
import { getProfiles, primaryProfile } from '@/lib/profileStore';
import type { StoredProfile } from '@/lib/profileStore';
import styles from './ProfilePicker.module.css';

/**
 * "Whose chart?" — one control, for every page that reads a saved chart.
 *
 * The calculators offered this from the start; the chart-derived pages did not.
 * /patterns and /prakriti silently used `primaryProfile()`, which is whichever
 * profile is newest — so a person who keeps charts for their family got their
 * Sade Sati answer for whoever they happened to add last, with nothing on the
 * page naming whose reading they were looking at or hinting another was
 * possible.
 *
 * Renders nothing when there is one profile or none: a select with a single
 * option is a label pretending to be a choice. The caller still gets the id.
 */
export default function ProfilePicker({
    value,
    onChange,
    onLoaded,
    label = 'Whose chart?',
    id = 'profile-picker',
}: {
    value: string;
    onChange: (profileId: string) => void;
    /** Fires once with the profiles and the default selection. */
    onLoaded?: (profiles: StoredProfile[], defaultId: string | null) => void;
    label?: string;
    id?: string;
}) {
    const [profiles, setProfiles] = useState<StoredProfile[]>([]);

    useEffect(() => {
        let cancelled = false;

        void getProfiles()
            .then((payload) => {
                if (cancelled) return;
                const list = payload?.profiles ?? [];
                setProfiles(list);
                onLoaded?.(list, primaryProfile(payload)?.id ?? list[0]?.id ?? null);
            })
            .catch(() => {
                // The page reports its own load failure; a missing picker is
                // not the error worth surfacing twice.
            });

        return () => { cancelled = true; };
        // Mount only. onLoaded is a callback the parent re-creates each render,
        // and depending on it would refetch on every keystroke upstream.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (profiles.length < 2) return null;

    return (
        <div className={styles.wrap}>
            <label className={styles.label} htmlFor={id}>{label}</label>
            <select
                id={id}
                className={styles.select}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name} · {p.dateOfBirth.slice(0, 10)}
                    </option>
                ))}
            </select>
        </div>
    );
}
