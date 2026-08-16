'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic, Square } from 'lucide-react';
import { isSpeechSupported, startDictation } from '@/lib/voice/speech';
import type { Dictation, SpeechStatus } from '@/lib/voice/speech';
import styles from './DictateButton.module.css';

/**
 * Push-to-talk for any composer.
 *
 * It only ever appends to the text the caller already holds. Nothing is sent
 * anywhere on our side from here — the seeker reads the words back and presses
 * send themselves, which is the "transcript confirmation" step the catalogue
 * asks for and the reason dictation cannot put words in someone's mouth.
 *
 * The disclosure is shown ONCE, before the microphone opens, and remembered.
 * Chrome and Edge stream the audio to Google to recognise it; Safari uses
 * Apple. Someone dictating a question about their marriage is sending that
 * audio to a third party, and they should know that before the first time
 * rather than never. Asking again every time would train people to dismiss it.
 */

const CONSENT_KEY = 'askchetna:voice-disclosed';

/**
 * The API either exists in this browser or it does not — it cannot appear
 * later, so there is nothing to subscribe to. useSyncExternalStore still wants
 * a subscribe function, and this is the honest one.
 */
const subscribeNever = () => () => {};

export default function DictateButton({
    language = 'en',
    onAppend,
    disabled = false,
}: {
    language?: 'en' | 'hi';
    /** Called with each settled chunk, to append to the composer. */
    onAppend: (text: string) => void;
    disabled?: boolean;
}) {
    // Whether this browser has the API is a fact about the browser, so it is
    // read as external state rather than copied into React state from an
    // effect. Deciding in an effect means one render with the button and one
    // without — and React now flags that pattern outright.
    //
    // The server snapshot is false, so nothing renders during SSR: the server
    // cannot know, and a control that appears and then vanishes is worse than
    // one that arrives a frame late.
    const supported = useSyncExternalStore(
        subscribeNever,
        isSpeechSupported,
        () => false
    );

    const [status, setStatus] = useState<SpeechStatus>('idle');
    const [asking, setAsking] = useState(false);
    const session = useRef<Dictation | null>(null);

    // Stop listening if this unmounts mid-sentence. A recogniser left running
    // after its button is gone is a microphone nobody can turn off.
    useEffect(() => () => session.current?.stop(), []);

    if (!supported) return null;

    const begin = () => {
        session.current = startDictation(language, {
            onTranscript: (text, final) => {
                // Interim results rewrite themselves as the engine changes its
                // mind. Only settled text is appended, or the composer would
                // fill with half-heard duplicates.
                if (final) onAppend(text);
            },
            onStatus: setStatus,
        });
    };

    const toggle = () => {
        if (status === 'listening') {
            session.current?.stop();
            session.current = null;
            return;
        }

        let disclosed = false;
        try {
            disclosed = window.localStorage.getItem(CONSENT_KEY) === '1';
        } catch {
            // A blocked localStorage just means asking again, which is the
            // safe direction to fail in for a disclosure.
        }

        if (!disclosed) {
            setAsking(true);
            return;
        }

        begin();
    };

    const accept = () => {
        try {
            window.localStorage.setItem(CONSENT_KEY, '1');
        } catch {
            // Not fatal — they will be asked again next time.
        }
        setAsking(false);
        begin();
    };

    return (
        <>
            <button
                type="button"
                className={`${styles.button} ${status === 'listening' ? styles.listening : ''}`}
                onClick={toggle}
                disabled={disabled}
                aria-label={status === 'listening' ? 'Stop dictating' : 'Dictate your question'}
                aria-pressed={status === 'listening'}
                title={status === 'listening' ? 'Stop' : 'Dictate'}
            >
                {status === 'listening' ? <Square size={16} /> : <Mic size={18} />}
            </button>

            {status === 'listening' && (
                <span className={styles.hint} role="status">
                    Listening — press again when you are done
                </span>
            )}

            {status === 'denied' && (
                <span className={styles.hint}>
                    Your browser is blocking the microphone. Allow it for this site in the
                    address bar, then try again.
                </span>
            )}

            {status === 'error' && (
                <span className={styles.hint}>Could not hear that. Try again.</span>
            )}

            {asking && (
                <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Before you dictate">
                    <div className={styles.sheetBody}>
                        <h2 className={styles.sheetTitle}>Before you speak</h2>
                        <p>
                            Your browser does the listening, not us — and to do it, Chrome and
                            Edge send the audio to Google, and Safari to Apple. We never receive
                            the recording.
                        </p>
                        <p>
                            What you say lands in the text box for you to read and edit. Nothing
                            is sent to Chetna until you press send.
                        </p>
                        <div className={styles.sheetActions}>
                            <button type="button" className={styles.cancel} onClick={() => setAsking(false)}>
                                Not now
                            </button>
                            <button type="button" className={styles.confirm} onClick={accept}>
                                Start dictating
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
