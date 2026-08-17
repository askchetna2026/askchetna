'use client';

import { useEffect, useState } from 'react';
import styles from './AdminCreateAiAstrologer.module.css';

/**
 * Creates an AI astrologer without a deploy.
 *
 * Before this, a new persona meant editing seed-ai-astrologers.mjs and running
 * it against three databases by hand. The console can do it now, and the
 * portrait brief comes with it — which is the part that actually takes thought.
 *
 * The brief updates live as the form is filled in, because it is built by
 * string assembly rather than a model call: no request, no cost, no waiting,
 * and the same input always produces the same brief.
 */

export default function AdminCreateAiAstrologer({ onCreated }: { onCreated?: () => void }) {
    const [displayName, setDisplayName] = useState('');
    const [specialities, setSpecialities] = useState('');
    const [languages, setLanguages] = useState('en, hi');
    const [tone, setTone] = useState('');
    const [bio, setBio] = useState('');
    const [notes, setNotes] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);

    const [portraitPrompt, setPortraitPrompt] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [showSystem, setShowSystem] = useState(false);
    const [copied, setCopied] = useState(false);

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

    // Refresh the brief whenever the inputs that shape it change. Debounced so
    // typing a name does not fire a request per keystroke.
    useEffect(() => {
        if (!displayName.trim()) {
            setPortraitPrompt('');
            setSystemPrompt('');
            return;
        }
        const id = setTimeout(() => {
            const qs = new URLSearchParams({ displayName, specialities, languages, tone, notes });
            void fetch(`/api/admin/astrologers/ai?${qs}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (!d) return;
                    setPortraitPrompt(d.portraitPrompt ?? '');
                    setSystemPrompt(d.systemPrompt ?? '');
                })
                .catch(() => {
                    // The form still submits; the preview is a convenience.
                });
        }, 350);
        return () => clearTimeout(id);
    }, [displayName, specialities, languages, tone, notes]);

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(portraitPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setMessage({ kind: 'bad', text: 'Could not reach the clipboard — select and copy by hand.' });
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setMessage(null);

        const body = new FormData();
        body.set('displayName', displayName);
        body.set('specialities', specialities);
        body.set('languages', languages);
        body.set('tone', tone);
        body.set('bio', bio);
        body.set('notes', notes);
        if (photo) body.set('photo', photo);

        try {
            const res = await fetch('/api/admin/astrologers/ai', { method: 'POST', body });
            const data = await res.json();

            if (!res.ok) {
                setMessage({ kind: 'bad', text: data.error ?? 'Could not create that astrologer.' });
                return;
            }

            setMessage({
                kind: 'ok',
                text: data.photoWarning ? `${data.message} ${data.photoWarning}` : data.message,
            });
            setDisplayName('');
            setSpecialities('');
            setTone('');
            setBio('');
            setNotes('');
            setPhoto(null);
            onCreated?.();
        } catch {
            setMessage({ kind: 'bad', text: 'Could not reach the server.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={styles.wrap}>
            <header className={styles.head}>
                <h3 className={styles.title}>New AI astrologer</h3>
                <p className={styles.sub}>
                    Creates the persona and its system prompt. The portrait brief below is
                    built as you type — generate the image wherever you like, then attach it.
                </p>
            </header>

            <form className={styles.form} onSubmit={submit}>
                <div className={styles.row}>
                    <div className={styles.field}>
                        <label htmlFor="ai-name">Name</label>
                        <input
                            id="ai-name"
                            className={styles.control}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={60}
                            placeholder="Aarav"
                            required
                        />
                    </div>
                    <div className={styles.fieldWide}>
                        <label htmlFor="ai-topics">Expertise</label>
                        <input
                            id="ai-topics"
                            className={styles.control}
                            value={specialities}
                            onChange={(e) => setSpecialities(e.target.value)}
                            placeholder="career, business, finance"
                            required
                        />
                        <small className={styles.hint}>Comma separated.</small>
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.field}>
                        <label htmlFor="ai-langs">Languages</label>
                        <input
                            id="ai-langs"
                            className={styles.control}
                            value={languages}
                            onChange={(e) => setLanguages(e.target.value)}
                            placeholder="en, hi"
                        />
                    </div>
                    <div className={styles.fieldWide}>
                        <label htmlFor="ai-tone">Manner</label>
                        <input
                            id="ai-tone"
                            className={styles.control}
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            placeholder="Warm and direct. Asks one question before answering."
                        />
                    </div>
                </div>

                <div className={styles.field}>
                    <label htmlFor="ai-bio">Bio</label>
                    <textarea
                        id="ai-bio"
                        className={`${styles.control} ${styles.area}`}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={800}
                        rows={3}
                        placeholder="Shown in the directory. Say plainly that this is an AI astrologer."
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="ai-notes">Extra instructions</label>
                    <textarea
                        id="ai-notes"
                        className={`${styles.control} ${styles.area}`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Anything else to bake into the system prompt. Optional."
                    />
                </div>

                {portraitPrompt && (
                    <div className={styles.promptBox}>
                        <div className={styles.promptHead}>
                            <span className={styles.promptLabel}>Portrait brief</span>
                            <button type="button" className={styles.copy} onClick={copyPrompt}>
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <pre className={styles.prompt}>{portraitPrompt}</pre>
                        <button
                            type="button"
                            className={styles.reveal}
                            onClick={() => setShowSystem((v) => !v)}
                            aria-expanded={showSystem}
                        >
                            {showSystem ? 'Hide' : 'Show'} the system prompt this persona will answer with
                        </button>
                        {showSystem && <pre className={styles.prompt}>{systemPrompt}</pre>}
                    </div>
                )}

                <div className={styles.field}>
                    <label htmlFor="ai-photo">Portrait</label>
                    <input
                        id="ai-photo"
                        className={styles.file}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    />
                    <small className={styles.hint}>
                        Optional now, and can be replaced later. Up to 5 MB; re-encoded to WebP
                        with its EXIF stripped on the way in.
                    </small>
                </div>

                <button type="submit" className={styles.submit} disabled={saving || !displayName.trim()}>
                    {saving ? 'Creating…' : 'Create astrologer'}
                </button>
            </form>

            {message && (
                <p className={message.kind === 'ok' ? styles.ok : styles.bad} role="status">
                    {message.text}
                </p>
            )}
        </section>
    );
}
