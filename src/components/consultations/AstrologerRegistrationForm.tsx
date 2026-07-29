'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import styles from './AstrologerRegistrationForm.module.css';

/**
 * Application to become an astrologer.
 *
 * Submitting creates a PENDING record — it does not grant anything. That
 * distinction is the point of the screen, so the copy says so before the button
 * rather than after, and the success state explains what happens next instead of
 * implying the applicant can now take consultations.
 */

const SPECIALITIES = [
    'Career', 'Relationships', 'Marriage', 'Finance',
    'Health', 'Education', 'Family', 'Spirituality',
];

const LANGUAGES = [
    { code: 'hi', label: 'Hindi' },
    { code: 'en', label: 'English' },
    { code: 'bn', label: 'Bengali' },
    { code: 'ta', label: 'Tamil' },
    { code: 'te', label: 'Telugu' },
    { code: 'mr', label: 'Marathi' },
    { code: 'gu', label: 'Gujarati' },
    { code: 'kn', label: 'Kannada' },
];

type ExistingStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' | null;

export default function AstrologerRegistrationForm({
    existingStatus,
    existingRejectionReason,
}: {
    existingStatus: ExistingStatus;
    existingRejectionReason?: string | null;
}) {
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [languages, setLanguages] = useState<string[]>(['hi', 'en']);
    const [specialities, setSpecialities] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
        set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

    // Already applied: show where it stands rather than a form that would be
    // rejected with a 409 the moment it is submitted.
    if (existingStatus && !submitted) {
        return (
            <div className={styles.status}>
                {existingStatus === 'PENDING' && (
                    <>
                        <h2 className={styles.statusTitle}>Your application is under review</h2>
                        <p className={styles.statusDetail}>
                            An admin will look at it shortly. You will be able to take
                            consultations once it is approved.
                        </p>
                    </>
                )}
                {existingStatus === 'APPROVED' && (
                    <>
                        <h2 className={styles.statusTitle}>You are an approved astrologer</h2>
                        <p className={styles.statusDetail}>
                            Set yourself available to start receiving consultations.
                        </p>
                        <a className={styles.link} href="/astrologer">
                            Go to your astrologer dashboard
                        </a>
                    </>
                )}
                {existingStatus === 'SUSPENDED' && (
                    <>
                        <h2 className={styles.statusTitle}>Your profile is suspended</h2>
                        <p className={styles.statusDetail}>
                            {existingRejectionReason ||
                                'Please contact support if you believe this is a mistake.'}
                        </p>
                    </>
                )}
                {existingStatus === 'REJECTED' && (
                    <>
                        <h2 className={styles.statusTitle}>Your application was not accepted</h2>
                        <p className={styles.statusDetail}>
                            {existingRejectionReason ||
                                'Please contact support if you would like to discuss this.'}
                        </p>
                    </>
                )}
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={styles.status}>
                <CheckCircle2 size={40} className={styles.tick} aria-hidden="true" />
                <h2 className={styles.statusTitle}>Application received</h2>
                <p className={styles.statusDetail}>
                    An admin will review your details. You will not appear in the directory,
                    and cannot take consultations, until it is approved.
                </p>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/astrologers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName, bio, languages, specialities }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? data.error ?? 'Could not submit your application.');
                return;
            }
            setSubmitted(true);
        } catch {
            setError('Could not submit. Check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
                <span className={styles.label}>Display name</span>
                <input
                    className={styles.input}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="The name seekers will see"
                />
            </label>

            <label className={styles.field}>
                <span className={styles.label}>About you</span>
                <textarea
                    className={styles.textarea}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    placeholder="Your background, your approach, how long you have practised."
                />
                <span className={styles.hint}>{bio.length}/2000</span>
            </label>

            <fieldset className={styles.field}>
                <legend className={styles.label}>Languages</legend>
                <div className={styles.chips}>
                    {LANGUAGES.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            className={`${styles.chip} ${languages.includes(l.code) ? styles.chipOn : ''}`}
                            onClick={() => toggle(languages, setLanguages, l.code)}
                            aria-pressed={languages.includes(l.code)}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </fieldset>

            <fieldset className={styles.field}>
                <legend className={styles.label}>Areas you work with</legend>
                <div className={styles.chips}>
                    {SPECIALITIES.map((s) => (
                        <button
                            key={s}
                            type="button"
                            className={`${styles.chip} ${specialities.includes(s.toLowerCase()) ? styles.chipOn : ''}`}
                            onClick={() => toggle(specialities, setSpecialities, s.toLowerCase())}
                            aria-pressed={specialities.includes(s.toLowerCase())}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </fieldset>

            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}

            <p className={styles.notice}>
                Applying does not grant access. An admin reviews every application, and you
                will not appear in the directory until yours is approved.
            </p>

            <button type="submit" className={styles.submit} disabled={submitting || !displayName.trim()}>
                {submitting && <Loader2 size={16} className={styles.spin} />}
                {submitting ? 'Submitting…' : 'Apply to be an astrologer'}
            </button>
        </form>
    );
}
