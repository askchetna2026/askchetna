'use client';

import { useEffect, useState } from 'react';
import { Bookmark, ChevronDown } from 'lucide-react';
import styles from './ConsultationMemory.module.css';

type Payload = {
    astrologer: { id: string; displayName: string; isAI: boolean };
    viewerIs: 'seeker' | 'astrologer';
    memory: { summary: string; sessionCount: number; lastSessionAt: string | null } | null;
};

/**
 * What carried over from earlier sessions.
 *
 * Shown to BOTH sides, for different reasons. A human astrologer reads it —
 * that is the entire feature for them, since nothing injects context into a
 * person. For an AI persona it is already in the prompt, and showing it is the
 * honesty half: a system that keeps notes on someone and will not show them the
 * notes is not one they can reasonably trust.
 *
 * Collapsed by default. It is context for the conversation, not the
 * conversation.
 */
export default function ConsultationMemory({
    astrologerId,
    seekerId,
}: {
    astrologerId: string;
    /** Only sent when an astrologer is viewing one of their seekers. */
    seekerId?: string;
}) {
    const [data, setData] = useState<Payload | null>(null);
    const [open, setOpen] = useState(false);
    const [forgetting, setForgetting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const qs = new URLSearchParams({ astrologerId });
                if (seekerId) qs.set('userId', seekerId);
                const res = await fetch(`/api/consultations/memory?${qs}`);
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (err) {
                console.error('Failed to load consultation memory:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [astrologerId, seekerId]);

    // Nothing carried over yet — a first session should look like a first
    // session rather than an empty box explaining that it is empty.
    if (!data?.memory) return null;

    const { memory, viewerIs, astrologer } = data;
    const forget = async () => {
        setForgetting(true);
        try {
            await fetch(`/api/consultations/memory?astrologerId=${astrologerId}`, {
                method: 'DELETE',
            });
            setData({ ...data, memory: null });
        } finally {
            setForgetting(false);
        }
    };

    const sessions = memory.sessionCount === 1 ? '1 earlier session' : `${memory.sessionCount} earlier sessions`;

    return (
        <section className={styles.panel}>
            <button
                className={styles.header}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <Bookmark size={14} aria-hidden="true" />
                <span className={styles.title}>
                    {viewerIs === 'astrologer'
                        ? 'What you know about this seeker'
                        : `What ${astrologer.displayName} remembers`}
                </span>
                <span className={styles.meta}>{sessions}</span>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                    aria-hidden="true"
                />
            </button>

            {open && (
                <div className={styles.body}>
                    <p className={styles.summary}>{memory.summary}</p>

                    {viewerIs === 'seeker' && (
                        <div className={styles.controls}>
                            <p className={styles.note}>
                                A short summary, rewritten after each session — not a
                                recording of what you said.
                            </p>
                            <button
                                className={styles.forget}
                                onClick={forget}
                                disabled={forgetting}
                            >
                                {forgetting ? 'Forgetting…' : 'Forget this'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
