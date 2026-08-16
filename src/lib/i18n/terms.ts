/**
 * The approved Jyotisa terminology, and the language plumbing around it.
 *
 * The catalogue asks for "an approved Jyotisa terminology dictionary for Lagna,
 * Rashi, Nakshatra, Dasha, Graha, Bhava, Yoga and related terms", and for the
 * language preference to be "passed explicitly" to the model rather than
 * inferred. Both are here.
 *
 * WHY A DICTIONARY AND NOT JUST TRANSLATION. These words are already Sanskrit.
 * A model asked to "reply in Hindi" will sometimes render lagna as उदय, sometimes
 * as लग्न, and sometimes translate it to "rising sign" and then back — so the
 * same concept arrives under three names across three screens and a reader
 * cannot tell whether they are the same thing. Fixing the vocabulary is what
 * makes multilingual output usable rather than merely translated.
 *
 * WHAT THIS IS NOT. It is not a UI translation layer. Every button, label and
 * heading in the app is still English, and pretending otherwise would be worse
 * than not starting: a half-translated interface reads as broken in a way a
 * consistent English one does not. What this covers is the part that is
 * actually most of the reading — the model's prose — plus the vocabulary it
 * must use. Extracting the interface strings is a separate and much larger
 * piece of work, and it gets more expensive with every screen shipped before
 * it, which is the argument for laying the foundation now.
 */

export type Language = 'en' | 'hi';

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी' },
];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
    return value === 'en' || value === 'hi';
}

export interface Term {
    /** Roman transliteration, used in English output. */
    en: string;
    /** Devanagari, used in Hindi output. */
    hi: string;
    /** Plain-language gloss, so the dictionary is readable on its own. */
    gloss: string;
}

/**
 * Keyed by the concept, not by either spelling.
 *
 * The keys match the glossary's term keys where they overlap, so the two stay
 * reconcilable.
 */
export const TERMS: Record<string, Term> = {
    lagna: { en: 'Lagna (ascendant)', hi: 'लग्न', gloss: 'The sign rising on the eastern horizon at birth.' },
    rashi: { en: 'Rashi (sign)', hi: 'राशि', gloss: 'One of the twelve signs.' },
    nakshatra: { en: 'Nakshatra', hi: 'नक्षत्र', gloss: 'One of the twenty-seven lunar divisions.' },
    pada: { en: 'Pada', hi: 'पाद', gloss: 'A quarter of a nakshatra.' },
    dasha: { en: 'Dasha', hi: 'दशा', gloss: 'A planetary period.' },
    mahadasha: { en: 'Mahadasha', hi: 'महादशा', gloss: 'The major planetary period.' },
    antardasha: { en: 'Antardasha', hi: 'अंतर्दशा', gloss: 'The sub-period inside a mahadasha.' },
    graha: { en: 'Graha (planet)', hi: 'ग्रह', gloss: 'A planet, in the Jyotisa sense.' },
    bhava: { en: 'Bhava (house)', hi: 'भाव', gloss: 'One of the twelve houses.' },
    yoga: { en: 'Yoga', hi: 'योग', gloss: 'A named combination of placements.' },
    dosha: { en: 'Dosha', hi: 'दोष', gloss: 'A placement traditionally read as a difficulty.' },
    gochar: { en: 'Gochar (transit)', hi: 'गोचर', gloss: 'Where the planets are now, against the birth chart.' },
    navamsa: { en: 'Navamsa', hi: 'नवांश', gloss: 'The ninth divisional chart.' },
    panchang: { en: 'Panchang', hi: 'पंचांग', gloss: 'The five limbs of the day: tithi, vara, nakshatra, yoga, karana.' },
    tithi: { en: 'Tithi', hi: 'तिथि', gloss: 'A lunar day.' },
    muhurta: { en: 'Muhurta', hi: 'मुहूर्त', gloss: 'A chosen window of time.' },
    ayanamsa: { en: 'Ayanamsa', hi: 'अयनांश', gloss: 'The offset between the tropical and sidereal zodiacs.' },
    sadesati: { en: 'Sade Sati', hi: 'साढ़े साती', gloss: 'The roughly seven and a half years of Saturn around the natal Moon.' },
};

/**
 * The instruction appended to every prompt.
 *
 * Built rather than stored in ai-prompts.md because it is the same for all
 * fifteen flows, and fifteen copies of a rule is fifteen places for it to drift.
 * The vocabulary list is generated from TERMS above, so adding a term makes it
 * authoritative everywhere at once.
 *
 * English returns an empty string. Appending "reply in English" to a prompt
 * that is already English adds tokens to every call for nothing, and models
 * occasionally over-correct by explaining that they are writing in English.
 */
export function languageInstruction(language: Language): string {
    if (language === 'en') return '';

    const vocabulary = Object.values(TERMS)
        .map((t) => `${t.en.replace(/\s*\(.*\)$/, '')} = ${t.hi}`)
        .join('; ');

    return [
        '',
        'LANGUAGE:',
        '- Write the entire response in Hindi (Devanagari script).',
        '- Keep every JSON key, field name and structural token exactly as specified, in English. Only the human-readable values are translated.',
        '- Use these established terms rather than inventing or re-translating them: ' + vocabulary + '.',
        '- Where a Sanskrit term has no natural Hindi equivalent, keep the Sanskrit in Devanagari rather than substituting an English word in Latin script.',
        '- Numbers, dates and degrees stay in Western digits.',
    ].join('\n');
}
