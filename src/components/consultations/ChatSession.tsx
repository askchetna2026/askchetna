'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, PhoneOff } from 'lucide-react';
import SessionTimer from './SessionTimer';
import ExtendPrompt from './ExtendPrompt';
import styles from './ChatSession.module.css';

/**
 * The live consultation screen.
 *
 * Polls rather than holds a socket. Supabase Realtime is the intended transport
 * (§4.1 of the plan) and slots in behind `refresh()`, but polling is what makes
 * the first version correct: the timer has to be reconciled against server time
 * anyway, so there is already a heartbeat, and a dropped socket must never be
 * the reason a user believes they still have paid time left.
 *
 * The server is the authority on every question that costs money — how long is
 * left, whether an extension succeeded, whether the session is over. This
 * component never decides any of them, it only reflects and asks.
 */

type Status = {
    id: string;
    kind: string;
    status: string;
    astrologer: { displayName: string; photoUrl: string | null };
    remainingSeconds: number;
    expired: boolean;
    creditsCharged: number;
    secondsPerBlock: number;
    canExtend: boolean;
    shouldPromptExtend: boolean;
    creditBalance?: number;
};

type Message = {
    id: string;
    body: string;
    sentAt: string;
    mine: boolean;
};

const POLL_MS = 4000;

export default function ChatSession({ consultationId }: { consultationId: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<Status | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [extending, setExtending] = useState(false);
    const [extendError, setExtendError] = useState<string | null>(null);
    const [promptDismissed, setPromptDismissed] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const lastMessageAt = useRef<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isLive = status ? ['REQUESTED', 'ACTIVE'].includes(status.status) : false;
    const isOver = status ? !isLive || status.expired : false;

    /** One round of server reconciliation: state, then anything new said. */
    const refresh = useCallback(async () => {
        try {
            const [stateRes, msgRes] = await Promise.all([
                fetch(`/api/consultations/${consultationId}`),
                fetch(
                    `/api/consultations/${consultationId}/messages` +
                        (lastMessageAt.current
                            ? `?since=${encodeURIComponent(lastMessageAt.current)}`
                            : '')
                ),
            ]);

            if (stateRes.ok) setStatus(await stateRes.json());

            if (msgRes.ok) {
                const data = await msgRes.json();
                if (data.messages?.length) {
                    setMessages((prev) => {
                        const seen = new Set(prev.map((m) => m.id));
                        const added = data.messages.filter((m: Message) => !seen.has(m.id));
                        return added.length ? [...prev, ...added] : prev;
                    });
                    lastMessageAt.current = data.messages[data.messages.length - 1].sentAt;
                }
            }
        } catch {
            // A dropped poll is not worth surfacing; the next one is 4s away and
            // the timer keeps counting from the last known server value.
        }
    }, [consultationId]);

    useEffect(() => {
        void refresh();
        const id = setInterval(refresh, POLL_MS);
        return () => clearInterval(id);
    }, [refresh]);

    // Stick to the newest message.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messages.length]);

    const send = async () => {
        const body = draft.trim();
        if (!body || sending || isOver) return;

        setSending(true);
        setNotice(null);
        try {
            const res = await fetch(`/api/consultations/${consultationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body }),
            });

            if (res.status === 409) {
                // Time ran out between the last poll and this send. The server has
                // already closed the session; reflect that rather than pretending.
                const data = await res.json();
                setNotice(data.message ?? 'This consultation has ended.');
                await refresh();
                return;
            }

            if (res.ok) {
                setDraft('');
                await refresh();
            }
        } finally {
            setSending(false);
        }
    };

    const extend = async () => {
        setExtending(true);
        setExtendError(null);
        try {
            const res = await fetch(`/api/consultations/${consultationId}/extend`, {
                method: 'POST',
            });
            const data = await res.json();

            if (!res.ok) {
                setExtendError(data.message ?? data.error ?? 'Could not extend.');
                return;
            }

            setPromptDismissed(false);
            await refresh();
        } catch {
            setExtendError('Could not extend. Check your connection.');
        } finally {
            setExtending(false);
        }
    };

    const end = async () => {
        await fetch(`/api/consultations/${consultationId}/end`, { method: 'POST' });
        await refresh();
    };

    // Re-poll the moment the local countdown hits zero, so the ended state
    // appears immediately rather than up to POLL_MS later.
    const onReachedZero = useCallback(() => {
        void refresh();
    }, [refresh]);

    if (!status) {
        return <div className={styles.loading}>Connecting…</div>;
    }

    const minutesPerBlock = Math.round(status.secondsPerBlock / 60);
    const showPrompt = status.shouldPromptExtend && !promptDismissed && !isOver;

    return (
        <div className={styles.session}>
            <header className={styles.header}>
                <div className={styles.who}>
                    <span className={styles.name}>{status.astrologer.displayName}</span>
                    <span className={styles.meta}>
                        {status.creditsCharged} credit
                        {status.creditsCharged === 1 ? '' : 's'} used
                    </span>
                </div>

                {isLive && !status.expired && (
                    <SessionTimer
                        serverRemaining={status.remainingSeconds}
                        warnAtSeconds={60}
                        onReachedZero={onReachedZero}
                    />
                )}

                {isLive && (
                    <button type="button" className={styles.end} onClick={end} aria-label="End consultation">
                        <PhoneOff size={16} />
                    </button>
                )}
            </header>

            <div className={styles.transcript} ref={scrollRef}>
                {messages.length === 0 && (
                    <p className={styles.empty}>
                        Say hello — your consultation has started and the clock is running.
                    </p>
                )}

                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`${styles.bubble} ${m.mine ? styles.mine : styles.theirs}`}
                    >
                        {m.body}
                    </div>
                ))}
            </div>

            {isOver && (
                <div className={styles.ended} role="status">
                    <p className={styles.endedTitle}>This consultation has ended</p>
                    <p className={styles.endedDetail}>
                        {status.creditsCharged} credit
                        {status.creditsCharged === 1 ? '' : 's'} used in total.
                    </p>
                    <button
                        type="button"
                        className={styles.again}
                        onClick={() => router.push('/consult')}
                    >
                        Find an astrologer
                    </button>
                </div>
            )}

            {showPrompt && (
                <ExtendPrompt
                    minutesPerCredit={minutesPerBlock}
                    creditBalance={status.creditBalance ?? 0}
                    extending={extending}
                    error={extendError}
                    onExtend={extend}
                    onDismiss={() => setPromptDismissed(true)}
                />
            )}

            {notice && <p className={styles.notice}>{notice}</p>}

            {!isOver && (
                <form
                    className={styles.composer}
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                    }}
                >
                    <input
                        className={styles.input}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Type your message…"
                        maxLength={4000}
                        aria-label="Message"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        className={styles.sendBtn}
                        disabled={!draft.trim() || sending}
                        aria-label="Send"
                    >
                        <Send size={18} />
                    </button>
                </form>
            )}
        </div>
    );
}
