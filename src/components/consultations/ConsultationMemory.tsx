'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, X } from 'lucide-react';
import styles from './ConsultationMemory.module.css';

type Memory = { summary: string; sessionCount: number; lastSessionAt: string | null } | null;

type Session = {
    id: string;
    at: string;
    endedAt: string | null;
    live: boolean;
    creditsCharged: number;
    messages: { id: string; body: string; sentAt: string; mine: boolean }[];
};

const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * Earlier conversations with this astrologer.
 *
 * A one-line trigger in the flow and everything else in a sheet, because this
 * is reference material for a live conversation. As an inline panel it grew
 * with its contents and took half the screen away from the chat it exists to
 * support — and the more history there was, the worse it got.
 *
 * The transcripts are the point. A rolling summary is what the MODEL reads, so
 * context can be carried without re-reading every prior session on every turn;
 * a person wants their own words back, not a paraphrase of them. The summary is
 * still shown, last and clearly labelled, because it is what the astrologer is
 * working from and hiding that would be worse.
 */
export default function ConsultationMemory({
    astrologerId,
    seekerId,
}: {
    astrologerId: string;
    /** Only sent when an astrologer is viewing one of their seekers. */
    seekerId?: string;
}) {
    const [memory, setMemory] = useState<Memory>(null);
    const [astrologerName, setAstrologerName] = useState('');
    const [viewerIs, setViewerIs] = useState<'seeker' | 'astrologer'>('seeker');
    const [sessions, setSessions] = useState<Session[] | null>(null);
    const [open, setOpen] = useState(false);
    const [openSession, setOpenSession] = useState<string | null>(null);
    const [forgetting, setForgetting] = useState(false);

    const qs = useCallback(() => {
        const p = new URLSearchParams({ astrologerId });
        if (seekerId) p.set('userId', seekerId);
        return p.toString();
    }, [astrologerId, seekerId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/consultations/memory?${qs()}`);
                if (!res.ok) return;
                const json = await res.json();
                if (cancelled) return;
                setMemory(json.memory);
                setAstrologerName(json.astrologer?.displayName ?? '');
                setViewerIs(json.viewerIs);
            } catch (err) {
                console.error('Failed to load consultation memory:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [qs]);

    // The transcripts are only fetched when the sheet is opened. They are the
    // heaviest thing here and most sessions never ask for them.
    useEffect(() => {
        if (!open || sessions !== null) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/consultations/history?${qs()}`);
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setSessions(json.sessions ?? []);
            } catch (err) {
                console.error('Failed to load conversation history:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, sessions, qs]);

    // Escape closes, and the page behind must not scroll while a sheet is over it.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    // Nothing to look back on yet. A first session should look like one rather
    // than offer an empty archive.
    if (!memory) return null;

    const forget = async () => {
        setForgetting(true);
        try {
            await fetch(`/api/consultations/memory?astrologerId=${astrologerId}`, { method: 'DELETE' });
            setMemory(null);
            setOpen(false);
        } finally {
            setForgetting(false);
        }
    };

    const sessionWord = memory.sessionCount === 1 ? 'conversation' : 'conversations';
    const past = sessions?.filter((s) => !s.live) ?? [];

    return (
        <>
            <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
                <History size={14} aria-hidden="true" />
                <span>
                    {viewerIs === 'astrologer'
                        ? `${memory.sessionCount} earlier ${sessionWord} with this seeker`
                        : `${memory.sessionCount} earlier ${sessionWord} with ${astrologerName}`}
                </span>
                <span className={styles.triggerAction}>Read</span>
            </button>

            {open &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={styles.overlay}
                        onClick={() => setOpen(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Earlier conversations"
                    >
                        <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                            <header className={styles.sheetHead}>
                                <h2 className={styles.sheetTitle}>Earlier conversations</h2>
                                <button
                                    type="button"
                                    className={styles.close}
                                    onClick={() => setOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </header>

                            <div className={styles.sheetBody}>
                                {sessions === null && <p className={styles.muted}>Loading…</p>}

                                {sessions !== null && past.length === 0 && (
                                    <p className={styles.muted}>
                                        No earlier conversations to show yet.
                                    </p>
                                )}

                                {past.map((s) => {
                                    const isOpen = openSession === s.id;
                                    return (
                                        <section key={s.id} className={styles.session}>
                                            <button
                                                type="button"
                                                className={styles.sessionHead}
                                                onClick={() => setOpenSession(isOpen ? null : s.id)}
                                                aria-expanded={isOpen}
                                            >
                                                <span className={styles.sessionDate}>{dayLabel(s.at)}</span>
                                                <span className={styles.sessionMeta}>
                                                    {s.messages.length} message
                                                    {s.messages.length === 1 ? '' : 's'}
                                                </span>
                                            </button>

                                            {isOpen && (
                                                <div className={styles.transcript}>
                                                    {s.messages.map((m) => (
                                                        <div
                                                            key={m.id}
                                                            className={`${styles.bubble} ${m.mine ? styles.mine : styles.theirs}`}
                                                        >
                                                            <span className={styles.bubbleBody}>{m.body}</span>
                                                            <span className={styles.bubbleTime}>
                                                                {timeLabel(m.sentAt)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}

                                {/* Last, and named for what it is. This is what the
                                    astrologer is prompted with, so hiding it would be
                                    worse than showing it — but it is not the record. */}
                                <section className={styles.summary}>
                                    <h3 className={styles.summaryTitle}>
                                        What {viewerIs === 'astrologer' ? 'you carry' : `${astrologerName} carries`} into this session
                                    </h3>
                                    <p className={styles.summaryBody}>{memory.summary}</p>

                                    {viewerIs === 'seeker' && (
                                        <div className={styles.controls}>
                                            <p className={styles.note}>
                                                A short summary, rewritten after each session — not a
                                                recording of what you said. Forgetting it does not
                                                delete the conversations above.
                                            </p>
                                            <button
                                                type="button"
                                                className={styles.forget}
                                                onClick={forget}
                                                disabled={forgetting}
                                            >
                                                {forgetting ? 'Forgetting…' : 'Forget this'}
                                            </button>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
