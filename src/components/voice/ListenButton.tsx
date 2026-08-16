'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { hasVoiceFor, isSpeechOutputSupported, readAloud } from '@/lib/voice/speak';
import type { Reading } from '@/lib/voice/speak';
import styles from './ListenButton.module.css';

/**
 * Read this aloud.
 *
 * Offered only when a voice for the language actually exists — a Hindi reading
 * rendered by an English voice is not accented Hindi, it is unintelligible, and
 * a control that produces that is worse than no control.
 *
 * The label says "Listen", and the note beside it says the voice is synthetic.
 * The catalogue is firm that nothing may imply a human astrologer, and a voice
 * is exactly where that line blurs — someone hearing a considered paragraph
 * read aloud in a warm tone will assume a person unless told otherwise, once,
 * plainly, where they can see it.
 */
export default function ListenButton({
    text,
    language = 'en',
    label = 'Listen',
}: {
    text: string;
    language?: 'en' | 'hi';
    label?: string;
}) {
    const [available, setAvailable] = useState(false);
    const reading = useRef<Reading | null>(null);

    /**
     * What is being read, and how far in.
     *
     * The TEXT is held alongside the progress rather than a bare boolean, so
     * "am I speaking?" is derived by comparing it with the text now on screen.
     * That is what makes a new answer arriving reset the control without an
     * effect writing state — the comparison simply stops matching.
     */
    const [session, setSession] = useState<{ text: string; at: number; of: number } | null>(null);
    const speaking = session !== null && session.text === text;

    useEffect(() => {
        let cancelled = false;
        if (!isSpeechOutputSupported()) return;
        hasVoiceFor(language).then((ok) => {
            if (!cancelled) setAvailable(ok);
        });
        return () => { cancelled = true; };
    }, [language]);

    // Silence the synthesiser when the answer changes or this unmounts. Both
    // touch an external system and neither writes state — a voice still
    // reading a page the reader has left is the worst version of this feature.
    useEffect(() => {
        return () => {
            reading.current?.stop();
            reading.current = null;
        };
    }, [text]);

    if (!available || !text.trim()) return null;

    const toggle = async () => {
        if (speaking) {
            reading.current?.stop();
            reading.current = null;
            setSession(null);
            return;
        }

        reading.current = await readAloud(text, language, {
            onStatus: (status) => {
                if (status === 'idle') setSession(null);
            },
            onProgress: (at, of) => setSession({ text, at, of }),
        });
    };

    return (
        <span className={styles.wrap}>
            <button
                type="button"
                className={`${styles.button} ${speaking ? styles.speaking : ''}`}
                onClick={() => void toggle()}
                aria-label={speaking ? 'Stop reading' : `${label} — read aloud`}
                aria-pressed={speaking}
            >
                {speaking ? <Square size={15} /> : <Volume2 size={16} />}
                <span className={styles.label}>{speaking ? 'Stop' : label}</span>
            </button>

            {speaking && session.of > 1 && (
                <span className={styles.progress} role="status">
                    {session.at} of {session.of}
                </span>
            )}

            {/* Said once, beside the control, not buried in a disclaimer. */}
            <span className={styles.synthetic}>Synthetic voice</span>
        </span>
    );
}
