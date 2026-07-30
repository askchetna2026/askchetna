'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import AstrologerAvatar from './AstrologerAvatar';
import styles from './AstrologerDirectory.module.css';

/**
 * Browse astrologers and open a consultation.
 *
 * Starting one spends a credit, so the cost is stated on the button rather than
 * discovered afterwards. Every failure the server can return is surfaced
 * verbatim — "insufficient credits", "already in a session", "unavailable" each
 * need a different response from the user, and collapsing them into "something
 * went wrong" leaves them with no idea what to do next.
 */

type Astrologer = {
    id: string;
    displayName: string;
    bio: string | null;
    photoUrl: string | null;
    languages: string[];
    specialities: string[];
    online: boolean;
    /** Disclosed by the API, never inferred from the name or bio. */
    isAI: boolean;
    /** Credits charged per block. 1 is the global default. */
    creditsPerBlock: number;
};

export default function AstrologerDirectory({
    minutesPerCredit,
}: {
    minutesPerCredit: number;
}) {
    const router = useRouter();
    const [astrologers, setAstrologers] = useState<Astrologer[] | null>(null);
    const [starting, setStarting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/astrologers');
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (!cancelled) setAstrologers(data.astrologers ?? []);
            } catch {
                if (!cancelled) {
                    setAstrologers([]);
                    setError('Could not load astrologers. Please try again.');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const start = async (astrologerId: string) => {
        setStarting(astrologerId);
        setError(null);
        try {
            const res = await fetch('/api/consultations/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ astrologerId, kind: 'CHAT' }),
            });
            const data = await res.json();

            if (!res.ok) {
                // Already mid-session: take them back to it rather than telling
                // them off. It is almost always a forgotten tab.
                if (data.consultationId) {
                    router.push(`/consult/${data.consultationId}`);
                    return;
                }
                setError(data.message ?? data.error ?? 'Could not start the consultation.');
                return;
            }

            router.push(`/consult/${data.consultationId}`);
        } catch {
            setError('Could not start the consultation. Check your connection.');
        } finally {
            setStarting(null);
        }
    };

    if (astrologers === null) {
        return (
            <div className={styles.loading}>
                <Loader2 size={20} className={styles.spin} />
                Loading astrologers…
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}

            {astrologers.length === 0 && !error && (
                <p className={styles.empty}>
                    No astrologers are listed yet. Please check back shortly.
                </p>
            )}

            <div className={styles.grid}>
                {astrologers.map((a) => (
                    <article key={a.id} className={`${styles.card} sacred-card`}>
                        <div className={styles.top}>
                            <AstrologerAvatar
                                name={a.displayName}
                                photoUrl={a.photoUrl}
                                size={64}
                            />
                            <div className={styles.identity}>
                                <h3 className={styles.name}>
                                    {a.displayName}
                                    {/* Disclosure, not decoration. Presenting an
                                        AI persona as a person is deceptive, and
                                        both stores treat it as grounds for
                                        rejection. The portrait beside it makes
                                        this badge matter more, not less — a face
                                        is exactly what invites the assumption
                                        that there is a person behind it. */}
                                    {a.isAI && (
                                        <span
                                            className={styles.aiTag}
                                            title="Replies are generated by AI"
                                        >
                                            AI
                                        </span>
                                    )}
                                </h3>
                                <span
                                    className={`${styles.presence} ${a.online ? styles.online : ''}`}
                                >
                                    {a.online ? 'Available' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        {a.specialities.length > 0 && (
                            <p className={styles.tags}>{a.specialities.join(' · ')}</p>
                        )}
                        {a.bio && <p className={styles.bio}>{a.bio}</p>}
                        {a.languages.length > 0 && (
                            <p className={styles.languages}>
                                Speaks {a.languages.join(', ')}
                            </p>
                        )}

                        <button
                            type="button"
                            className={styles.start}
                            onClick={() => start(a.id)}
                            disabled={!a.online || starting === a.id}
                        >
                            <MessageSquare size={16} />
                            {/* The astrologer's own rate, not a flat 1 — the
                                button is where the seeker decides to spend, so
                                it has to state what will actually be charged. */}
                            {starting === a.id
                                ? 'Starting…'
                                : `Chat — ${a.creditsPerBlock} credit${a.creditsPerBlock === 1 ? '' : 's'} / ${minutesPerCredit} min`}
                        </button>
                    </article>
                ))}
            </div>
        </div>
    );
}
