'use client';

/**
 * Dictation, using what the browser already has.
 *
 * The catalogue's MVP for this is "push-to-talk + transcript confirmation +
 * text response", and every part of that ships in the browser: the Web Speech
 * API has been in Chrome, Edge and Safari for years. No provider, no key, no
 * per-minute cost, and nothing new in the bundle.
 *
 * WHERE THE AUDIO GOES, because this is the part worth being straight about.
 * Chrome and Edge do not recognise speech on the device — they stream the audio
 * to Google's servers and return text. Safari uses Apple's service. So a seeker
 * dictating a question about their marriage is sending that audio to a third
 * party, and the UI says so before the microphone opens rather than in a
 * privacy page nobody reads. It is also why this only ever fills the composer:
 * nothing is sent anywhere on our side until the person has read the words back
 * and pressed send themselves.
 *
 * WHERE IT DOES NOT WORK. Firefox has no implementation. iOS WKWebView — which
 * is what the Capacitor app runs inside — does not expose it either, so the
 * iOS app gets nothing. Rather than degrade to a broken button, `isSupported()`
 * is checked before anything renders and the control is simply absent. A
 * microphone that does nothing is worse than no microphone.
 */

export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'error';

interface SpeechRecognitionAlternativeLike {
    transcript: string;
}

interface SpeechRecognitionResultLike {
    readonly length: number;
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: {
        readonly length: number;
        [index: number]: SpeechRecognitionResultLike;
    };
}

interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function constructorFor(): RecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
        SpeechRecognition?: RecognitionConstructor;
        webkitSpeechRecognition?: RecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Whether dictation can work here at all. Checked before rendering anything. */
export function isSpeechSupported(): boolean {
    return constructorFor() !== null;
}

export interface Dictation {
    stop(): void;
}

export interface DictationHandlers {
    /**
     * Called as the words arrive. `final` says whether the engine has settled
     * on them — interim results change under the reader, which is fine in a
     * textarea they are watching and would be wrong to send anywhere.
     */
    onTranscript(text: string, final: boolean): void;
    onStatus(status: SpeechStatus): void;
}

/**
 * Start listening. Returns a handle, or null if unsupported.
 *
 * `language` is the seeker's own setting, so someone who has asked Chetna to
 * write in Hindi also dictates in Hindi. Passing the wrong tag is the single
 * biggest cause of dictation looking broken — an engine set to en-US given
 * Hindi audio returns confident nonsense rather than an error.
 */
export function startDictation(
    language: 'en' | 'hi',
    handlers: DictationHandlers
): Dictation | null {
    const Recognition = constructorFor();
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    // Keep going across pauses — people think mid-sentence when the question is
    // a real one.
    recognition.continuous = true;
    recognition.interimResults = true;

    let stopped = false;

    recognition.onresult = (event) => {
        let text = '';
        let final = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            text += result[0]?.transcript ?? '';
            if (result.isFinal) final = true;
        }
        if (text) handlers.onTranscript(text, final);
    };

    recognition.onerror = (event) => {
        // Told apart because the fix differs: a denied permission needs the
        // browser's own settings, everything else needs another try.
        handlers.onStatus(
            event.error === 'not-allowed' || event.error === 'service-not-allowed'
                ? 'denied'
                : 'error'
        );
        stopped = true;
    };

    recognition.onend = () => {
        if (!stopped) handlers.onStatus('idle');
    };

    try {
        recognition.start();
        handlers.onStatus('listening');
    } catch {
        // start() throws if called while already running.
        handlers.onStatus('error');
        return null;
    }

    return {
        stop() {
            stopped = true;
            try {
                recognition.stop();
            } catch {
                // Already stopped; nothing to do.
            }
            handlers.onStatus('idle');
        },
    };
}
