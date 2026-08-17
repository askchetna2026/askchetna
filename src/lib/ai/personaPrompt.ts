/**
 * Builds the two prompts an AI astrologer needs: the system prompt it answers
 * with, and the portrait prompt an admin feeds to an image tool.
 *
 * Deterministic string assembly, not a model call. Three reasons that matters:
 * a persona created from the console must be reproducible rather than different
 * every time the button is pressed; the safety clauses below are the ones both
 * stores care about and must not be paraphrased away by a model having an
 * off day; and it costs nothing and cannot fail, so creating an astrologer
 * never depends on a provider being up.
 *
 * The shared rules are copied from scripts/seed-ai-astrologers.mjs so a persona
 * built here is the same shape as Vidhi and Maitri, who were seeded by hand.
 */

/** The non-negotiable part of every AI persona's system prompt. */
export const SHARED_PERSONA_RULES = `
You are an astrologer on AskChetna, an awareness-first Vedic astrology platform.
The platform's position is "understand patterns, not predictions", and you hold
to it: you describe tendencies, timing and the shape of a situation, and you do
not hand down fixed outcomes.

You are an AI. If a seeker asks whether they are talking to a person, say so
plainly and without embarrassment. Never invent a human biography, a lineage,
a guru, or years of practice.

Keep replies to two or three short paragraphs. This is a live chat and the
seeker is paying for the time.
`.trim();

export interface PersonaInput {
    displayName: string;
    /** Free-text topics, e.g. ["career", "marriage timing"]. */
    specialities: string[];
    /** ISO codes the persona answers in. */
    languages: string[];
    /** One or two lines on manner — "warm and direct", "quiet, asks questions". */
    tone?: string;
    /** Anything else the admin wants baked in. */
    notes?: string;
}

function tidy(list: string[]): string[] {
    return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

function readableList(items: string[]): string {
    const list = tidy(items);
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
};

/**
 * The system prompt the persona answers with.
 */
export function buildSystemPrompt(input: PersonaInput): string {
    const topics = readableList(input.specialities);
    const languages = readableList(
        tidy(input.languages).map((code) => LANGUAGE_NAMES[code] ?? code)
    );

    const parts = [SHARED_PERSONA_RULES, ''];

    parts.push(`Your name is ${input.displayName.trim()}.`);

    if (topics) {
        parts.push(
            `Your expertise is ${topics}. When a question falls outside that, say so and ` +
            `answer only as far as the chart supports — do not stretch into a subject you ` +
            `were not built for.`
        );
    }

    if (languages) {
        parts.push(`You answer in ${languages}, matching whichever the seeker writes in.`);
    }

    if (input.tone?.trim()) {
        parts.push(`Your manner: ${input.tone.trim()}`);
    }

    if (input.notes?.trim()) {
        parts.push(input.notes.trim());
    }

    /* Repeated at the end deliberately. These are the clauses that keep the
       product on the right side of both stores and of its own positioning, and
       a long prompt's last lines carry more weight than its middle. */
    parts.push(
        `Never predict death, illness, or the outcome of a legal or financial matter, and ` +
        `never present a reading as a substitute for a doctor, a lawyer or a financial adviser.`
    );

    return parts.filter(Boolean).join('\n\n');
}

/**
 * A portrait brief detailed enough to paste straight into an image tool.
 *
 * Carries the house constraints from docs/ASTROLOGER-PORTRAIT-PROMPTS.md rather
 * than leaving them to be remembered: the parchment palette, a painted look
 * rather than a photographic one, and no real person's likeness. That last is
 * not a style note — a portrait that resembles an identifiable human being,
 * presented as an astrologer who does not exist, is the kind of thing that ends
 * up in a complaint.
 */
export function buildPortraitPrompt(input: PersonaInput): string {
    const topics = readableList(input.specialities);

    return [
        `Portrait of ${input.displayName.trim()}, an illustrated astrologer character for a ` +
        `Vedic astrology app.`,
        '',
        topics
            ? `Their subject is ${topics} — let that show in bearing and expression rather than ` +
              `in props or symbols.`
            : '',
        input.tone?.trim() ? `Manner: ${input.tone.trim()}` : '',
        '',
        'STYLE',
        '- Painted illustration, not a photograph and not 3D. Soft brushwork, visible texture.',
        '- Warm parchment palette: aged cream #F2EAD5 background, deep ink #251A11, muted gold',
        '  #B5892E for ornament, and a single warm coral #7A2C12 accent at most.',
        '- Head and shoulders, facing slightly off-centre, calm and attentive expression.',
        '- Even, diffuse light. No hard studio shadows, no lens flare, no bokeh.',
        '- Plain or very softly textured background. Nothing busy behind the head.',
        '',
        'MUST NOT',
        '- No resemblance to any real or identifiable person, living or dead.',
        '- No text, no watermark, no logo, no signature.',
        '- No zodiac wheels, crystal balls, tarot cards or floating symbols.',
        '- No hyper-realistic skin detail; this should read clearly as an illustration.',
        '',
        'FORMAT',
        '- Square, 1:1, at least 600x600, centred with room around the head.',
    ]
        .filter((line) => line !== '' || true)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
