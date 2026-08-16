'use client';

/**
 * Reading an answer aloud, using the browser's own synthesiser.
 *
 * The counterpart to dictation, and available in more places: speechSynthesis
 * exists in iOS WKWebView where SpeechRecognition does not, so the iOS app gets
 * this even though it cannot get the microphone. No provider, no key, no cost,
 * and unlike recognition it does not send anything anywhere — synthesis happens
 * on the device.
 *
 * NEVER AUTOPLAY. Nothing here starts without a press. A voice beginning on its
 * own in a room with other people is a small betrayal, and these answers are
 * about someone's marriage or their work.
 *
 * TWO BROWSER FAULTS THIS WORKS AROUND, both well known:
 *
 *  - Chrome silently stops an utterance after roughly fifteen seconds. Long
 *    readings are therefore split into sentences and queued, so no single
 *    utterance is long enough to hit it.
 *  - getVoices() is empty on first call and populated asynchronously, so voice
 *    selection waits for `voiceschanged` rather than assuming the list is ready.
 */

export type SpeakStatus = 'idle' | 'speaking';

export interface SpeakHandlers {
    onStatus(status: SpeakStatus): void;
    /** Which sentence is being read, for a progress cue. */
    onProgress?(index: number, total: number): void;
}

export function isSpeechOutputSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Split into utterance-sized pieces on sentence boundaries.
 *
 * Sentences rather than a fixed character count, because a synthesiser handed a
 * fragment reads it with the wrong intonation — a sentence cut in half is
 * audibly cut in half.
 */
export function toSentences(text: string, maxChars = 220): string[] {
    const rough = text
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?।])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

    // A single sentence longer than the cap is split on commas, then hard.
    const out: string[] = [];
    for (const sentence of rough) {
        if (sentence.length <= maxChars) {
            out.push(sentence);
            continue;
        }
        let buffer = '';
        for (const clause of sentence.split(/(?<=,)\s+/)) {
            if ((buffer + ' ' + clause).trim().length > maxChars) {
                if (buffer) out.push(buffer.trim());
                buffer = clause;
            } else {
                buffer = (buffer + ' ' + clause).trim();
            }
        }
        if (buffer) out.push(buffer.trim());
    }
    return out;
}

/** Voices arrive asynchronously; resolve once the list is populated. */
function voicesReady(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
        const existing = window.speechSynthesis.getVoices();
        if (existing.length) {
            resolve(existing);
            return;
        }

        const done = () => {
            window.speechSynthesis.removeEventListener('voiceschanged', done);
            resolve(window.speechSynthesis.getVoices());
        };
        window.speechSynthesis.addEventListener('voiceschanged', done);
        // Some browsers never fire it. Do not hang the button waiting.
        setTimeout(done, 1000);
    });
}

/**
 * Whether a voice exists for this language.
 *
 * Worth knowing before offering the control: a Hindi reading rendered by an
 * English voice is not accented Hindi, it is unintelligible, and offering it
 * would be worse than not offering it.
 */
export async function hasVoiceFor(language: 'en' | 'hi'): Promise<boolean> {
    if (!isSpeechOutputSupported()) return false;
    const voices = await voicesReady();
    const wanted = language === 'hi' ? 'hi' : 'en';
    return voices.some((v) => v.lang?.toLowerCase().startsWith(wanted));
}

export interface Reading {
    stop(): void;
}

/**
 * Read `text` aloud. Returns a handle, or null if it cannot.
 *
 * Cancels anything already speaking first — two readings at once is never what
 * anybody wanted, and the browser will happily do it.
 */
export async function readAloud(
    text: string,
    language: 'en' | 'hi',
    handlers: SpeakHandlers
): Promise<Reading | null> {
    if (!isSpeechOutputSupported()) return null;

    const synth = window.speechSynthesis;
    synth.cancel();

    const voices = await voicesReady();
    const tag = language === 'hi' ? 'hi' : 'en';
    const voice =
        voices.find((v) => v.lang?.toLowerCase().startsWith(language === 'hi' ? 'hi-in' : 'en-in')) ??
        voices.find((v) => v.lang?.toLowerCase().startsWith(tag)) ??
        null;

    const chunks = toSentences(text);
    if (!chunks.length) return null;

    let stopped = false;
    let index = 0;

    const speakNext = () => {
        if (stopped || index >= chunks.length) {
            if (!stopped) handlers.onStatus('idle');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? (language === 'hi' ? 'hi-IN' : 'en-IN');
        // Slightly under default. These are reflective readings, not directions.
        utterance.rate = 0.95;

        utterance.onend = () => {
            index += 1;
            handlers.onProgress?.(index, chunks.length);
            speakNext();
        };

        // A failed chunk must not strand the rest — move on rather than stop.
        utterance.onerror = () => {
            index += 1;
            speakNext();
        };

        synth.speak(utterance);
    };

    handlers.onStatus('speaking');
    handlers.onProgress?.(0, chunks.length);
    speakNext();

    return {
        stop() {
            stopped = true;
            synth.cancel();
            handlers.onStatus('idle');
        },
    };
}
