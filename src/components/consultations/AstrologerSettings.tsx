'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, X } from 'lucide-react';
import PhotoUploadField from './PhotoUploadField';
import styles from './AstrologerSettings.module.css';

/**
 * The two things an astrologer owns and nobody else may write for them: the
 * words seekers read, and the hours they will be booked in.
 *
 * They sit on one screen because they are the same task — "set up my practice" —
 * and splitting them would leave the hours editor with no obvious home. They
 * save separately, though: a failed schedule write must not roll back a bio the
 * astrologer had already got right.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Window_ = { dayOfWeek: number; startMinute: number; endMinute: number };

const toTime = (m: number) =>
    `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

export default function AstrologerSettings() {
    const [loading, setLoading] = useState(true);

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [languages, setLanguages] = useState<string[]>([]);
    const [specialities, setSpecialities] = useState<string[]>([]);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoMsg, setPhotoMsg] = useState<string | null>(null);
    const [options, setOptions] = useState<{ languages: string[]; specialities: string[] }>({
        languages: [],
        specialities: [],
    });

    const [windows, setWindows] = useState<Window_[]>([]);
    const [timezone, setTimezone] = useState('Asia/Kolkata');

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingHours, setSavingHours] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [hoursMsg, setHoursMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const [pRes, wRes] = await Promise.all([
                fetch('/api/astrologer/profile'),
                fetch('/api/astrologer/availability-windows'),
            ]);
            if (pRes.ok) {
                const { profile, options: opts } = await pRes.json();
                setDisplayName(profile.displayName ?? '');
                setBio(profile.bio ?? '');
                setLanguages(profile.languages ?? []);
                setSpecialities(profile.specialities ?? []);
                setPhotoUrl(profile.photoUrl ?? null);
                setOptions(opts);
            }
            if (wRes.ok) {
                const { windows: rows } = await wRes.json();
                setWindows(
                    rows.map((w: Window_) => ({
                        dayOfWeek: w.dayOfWeek,
                        startMinute: w.startMinute,
                        endMinute: w.endMinute,
                    }))
                );
                // An existing schedule already carries a zone. A first-time
                // schedule takes the browser's, which is right far more often
                // than any default we could pick.
                if (rows[0]?.timezone) setTimezone(rows[0].timezone);
                else {
                    try {
                        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
                    } catch {
                        /* keep the default */
                    }
                }
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
        set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

    const saveProfile = async () => {
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            const res = await fetch('/api/astrologer/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName, bio, languages, specialities }),
            });
            const body = await res.json();
            setProfileMsg({
                ok: res.ok,
                text: res.ok
                    ? body.message ?? 'Saved.'
                    : body.message ?? body.error ?? 'Could not save.',
            });
        } catch {
            setProfileMsg({ ok: false, text: 'Could not save. Check your connection.' });
        } finally {
            setSavingProfile(false);
        }
    };

    const saveHours = async () => {
        // Caught here rather than at the server so the astrologer is told which
        // row is wrong while they are still looking at it.
        const bad = windows.find((w) => w.endMinute <= w.startMinute);
        if (bad) {
            setHoursMsg({
                ok: false,
                text: `${DAYS[bad.dayOfWeek]} ends at or before it starts. Fix that row first.`,
            });
            return;
        }

        setSavingHours(true);
        setHoursMsg(null);
        try {
            const res = await fetch('/api/astrologer/availability-windows', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timezone, windows }),
            });
            const body = await res.json();
            setHoursMsg({
                ok: res.ok,
                text: res.ok
                    ? windows.length === 0
                        ? 'Saved. With no hours published, nobody can book you — you can still take sessions on duty.'
                        : `Saved. ${windows.length} window${windows.length === 1 ? '' : 's'} published.`
                    : body.message ?? body.error ?? 'Could not save.',
            });
        } catch {
            setHoursMsg({ ok: false, text: 'Could not save. Check your connection.' });
        } finally {
            setSavingHours(false);
        }
    };

    if (loading) {
        return (
            <p className={styles.loading}>
                <Loader2 size={18} className={styles.spin} aria-hidden="true" /> Loading…
            </p>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.top}>
                    <p className={styles.eyebrow}>Your practice</p>
                    <h1 className={styles.title}>What seekers see, and when</h1>
                    <Link href="/astrologer" className={styles.back}>
                        ← Back to your desk
                    </Link>
                </header>

                {/* ── Profile ─────────────────────────────────────────── */}
                <section className={styles.card}>
                    <div className={styles.head}>
                        <h2>Your profile</h2>
                        <span className={styles.rule} />
                    </div>

                    <div className={styles.field}>
                        <span className={styles.label}>Your photo</span>
                        {/* Saves on selection, not with the button below. A
                            portrait is its own upload, and pretending it is part
                            of the form would mean an unsaved image sitting next
                            to a saved bio. */}
                        <PhotoUploadField
                            endpoint="/api/astrologer/photo"
                            initialPreview={photoUrl}
                            onUploaded={(url) => {
                                if (!url) return;
                                setPhotoUrl(url);
                                setPhotoMsg('Saved. Seekers see this photo now.');
                            }}
                        />
                        {photoMsg && (
                            <p className={styles.ok} role="status">
                                {photoMsg}
                            </p>
                        )}
                    </div>

                    <label className={styles.field}>
                        <span className={styles.label}>Display name</span>
                        <input
                            className={styles.input}
                            value={displayName}
                            maxLength={60}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.label}>About your practice</span>
                        <textarea
                            className={styles.textarea}
                            value={bio}
                            rows={6}
                            maxLength={2000}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="How you read, and what a seeker can expect from a session with you."
                        />
                        <span className={styles.counter}>{bio.length} / 2000</span>
                    </label>

                    <fieldset className={styles.fieldset}>
                        <legend className={styles.label}>Languages you consult in</legend>
                        <div className={styles.chips}>
                            {options.languages.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    className={`${styles.chip} ${languages.includes(l) ? styles.chipOn : ''}`}
                                    aria-pressed={languages.includes(l)}
                                    onClick={() => toggle(languages, setLanguages, l)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.fieldset}>
                        <legend className={styles.label}>What you read for</legend>
                        <div className={styles.chips}>
                            {options.specialities.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className={`${styles.chip} ${specialities.includes(s) ? styles.chipOn : ''}`}
                                    aria-pressed={specialities.includes(s)}
                                    onClick={() => toggle(specialities, setSpecialities, s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className={styles.foot}>
                        <button
                            type="button"
                            className={styles.btnFill}
                            onClick={saveProfile}
                            disabled={savingProfile}
                        >
                            {savingProfile ? 'Saving…' : 'Save profile'}
                        </button>
                        {profileMsg && (
                            <p
                                className={profileMsg.ok ? styles.ok : styles.bad}
                                role={profileMsg.ok ? 'status' : 'alert'}
                            >
                                {profileMsg.text}
                            </p>
                        )}
                    </div>
                </section>

                {/* ── Hours ───────────────────────────────────────────── */}
                <section className={styles.card}>
                    <div className={styles.head}>
                        <h2>Your hours</h2>
                        <span className={styles.rule} />
                    </div>
                    <p className={styles.explain}>
                        The times you will take <b>booked</b> appointments. Seekers can only
                        request a slot inside these windows — publish none and nothing can be
                        booked, though you can still take walk-in sessions whenever you are on
                        duty. Written in your own wall clock, and shown to each seeker in theirs.
                    </p>

                    <label className={styles.field}>
                        <span className={styles.label}>Your time zone</span>
                        <input
                            className={styles.input}
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            placeholder="Asia/Kolkata"
                        />
                        <span className={styles.counter}>
                            IANA name, e.g. Asia/Kolkata. Every window below is read in this zone.
                        </span>
                    </label>

                    {windows.length === 0 ? (
                        <p className={styles.emptyRow}>
                            No hours published yet. Add one below to start taking appointments.
                        </p>
                    ) : (
                        <div className={styles.rows}>
                            {windows.map((w, i) => (
                                <div key={i} className={styles.row}>
                                    <select
                                        className={styles.select}
                                        value={w.dayOfWeek}
                                        aria-label="Day"
                                        onChange={(e) =>
                                            setWindows(
                                                windows.map((x, j) =>
                                                    j === i
                                                        ? { ...x, dayOfWeek: Number(e.target.value) }
                                                        : x
                                                )
                                            )
                                        }
                                    >
                                        {DAYS.map((d, n) => (
                                            <option key={d} value={n}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="time"
                                        className={styles.time}
                                        aria-label="From"
                                        value={toTime(w.startMinute)}
                                        onChange={(e) =>
                                            setWindows(
                                                windows.map((x, j) =>
                                                    j === i
                                                        ? { ...x, startMinute: toMinutes(e.target.value) }
                                                        : x
                                                )
                                            )
                                        }
                                    />
                                    <span className={styles.dash}>to</span>
                                    <input
                                        type="time"
                                        className={styles.time}
                                        aria-label="To"
                                        value={toTime(w.endMinute)}
                                        onChange={(e) =>
                                            setWindows(
                                                windows.map((x, j) =>
                                                    j === i
                                                        ? { ...x, endMinute: toMinutes(e.target.value) }
                                                        : x
                                                )
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className={styles.remove}
                                        aria-label={`Remove ${DAYS[w.dayOfWeek]} window`}
                                        onClick={() => setWindows(windows.filter((_, j) => j !== i))}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        className={styles.addRow}
                        onClick={() =>
                            setWindows([
                                ...windows,
                                { dayOfWeek: 1, startMinute: 18 * 60, endMinute: 21 * 60 },
                            ])
                        }
                    >
                        <Plus size={15} aria-hidden="true" /> Add a window
                    </button>

                    <div className={styles.foot}>
                        <button
                            type="button"
                            className={styles.btnFill}
                            onClick={saveHours}
                            disabled={savingHours}
                        >
                            {savingHours ? 'Saving…' : 'Save hours'}
                        </button>
                        {hoursMsg && (
                            <p
                                className={hoursMsg.ok ? styles.ok : styles.bad}
                                role={hoursMsg.ok ? 'status' : 'alert'}
                            >
                                {hoursMsg.text}
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
