/**
 * Muhurat — when to do a particular thing, and when not to.
 *
 * Panchang has been complete here for months: tithi, nakshatra, vara, yoga,
 * karana, sunrise and sunset, Rahu Kaalam, Yamaganda and Abhijit. What was
 * missing is the step that makes any of it usable — choosing an intention and
 * being shown the windows that suit it.
 *
 * The methodology is Choghadiya, chosen because it is documented, entirely
 * deterministic and does not require an astrologer's judgement to apply: the
 * daylight span is divided into eight parts from sunrise, each takes a label
 * from a weekday-dependent rotation, and each label has a traditional character.
 * Nothing here is interpreted or generated. Given the same date and place, it
 * produces the same answer for everyone, which is the property a timing tool
 * needs and a prediction does not have.
 *
 * SAFEGUARD, and the reason the copy is worded the way it is: a muhurat does
 * not guarantee an outcome. It is a convention about when to begin, and the
 * honest claim is that it removes a reason to hesitate — not that it makes
 * things work. Every string in this file is written to that line.
 *
 * No ephemeris in the import chain, so the pages can read the types directly.
 */

export type Quality = 'good' | 'neutral' | 'avoid';

export interface Choghadiya {
    name: string;
    /** What the tradition says the window is for. */
    character: string;
    quality: Quality;
    /** ISO instants. */
    start: string;
    end: string;
}

export type IntentionKey =
    | 'begin'
    | 'conversation'
    | 'travel'
    | 'study'
    | 'agreement'
    | 'ceremony';

export interface Intention {
    key: IntentionKey;
    label: string;
    /** Said in the user's terms, not the tradition's. */
    blurb: string;
    /** Choghadiya names that traditionally suit this. */
    prefers: string[];
    /** Nakshatra categories that traditionally suit this. */
    prefersCategories: NakshatraCategory[];
}

/* ── Choghadiya ─────────────────────────────────────────────────────────── */

const CHOGHADIYA_META: Record<string, { character: string; quality: Quality }> = {
    Amrit: { character: 'The most open of the eight. Traditionally used for anything that matters.', quality: 'good' },
    Shubh: { character: 'Used for ceremony, commitments and anything formal.', quality: 'good' },
    Labh: { character: 'Used for gain — work, study, trade, anything you want to compound.', quality: 'good' },
    Char: { character: 'Movable. Traditionally the window for travel and for things that need to keep moving.', quality: 'neutral' },
    Rog: { character: 'Traditionally avoided, except for confronting a difficulty head-on.', quality: 'avoid' },
    Kaal: { character: 'Traditionally avoided for anything begun with hope.', quality: 'avoid' },
    Udveg: { character: 'Restless. Traditionally avoided for decisions.', quality: 'avoid' },
};

/**
 * The daytime rotation, indexed by JavaScript's getDay() — 0 is Sunday.
 *
 * Each row is the eight daylight parts in order from sunrise. The night
 * sequence differs and is deliberately not included: this surface answers
 * "when today", and offering night windows would invite scheduling a signing
 * for 2am on the strength of a label.
 */
const DAY_SEQUENCE: string[][] = [
    /* Sun */ ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'],
    /* Mon */ ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'],
    /* Tue */ ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],
    /* Wed */ ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'],
    /* Thu */ ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'],
    /* Fri */ ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],
    /* Sat */ ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal'],
];

/**
 * The eight daylight windows for a date.
 *
 * `weekday` is passed in rather than derived, because the row depends on the
 * LOCAL day at the place in question and this module does not know the zone.
 */
export function choghadiyaFor(
    sunriseIso: string,
    sunsetIso: string,
    weekday: number
): Choghadiya[] {
    const sunrise = Date.parse(sunriseIso);
    const sunset = Date.parse(sunsetIso);
    if (!Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunset <= sunrise) return [];

    const part = (sunset - sunrise) / 8;
    const row = DAY_SEQUENCE[((weekday % 7) + 7) % 7];

    return row.map((name, i) => ({
        name,
        character: CHOGHADIYA_META[name].character,
        quality: CHOGHADIYA_META[name].quality,
        start: new Date(sunrise + i * part).toISOString(),
        end: new Date(sunrise + (i + 1) * part).toISOString(),
    }));
}

/* ── Nakshatra character ────────────────────────────────────────────────── */

export type NakshatraCategory =
    | 'Fixed'
    | 'Movable'
    | 'Swift'
    | 'Gentle'
    | 'Fierce'
    | 'Sharp'
    | 'Mixed';

/** Indexed 0-26, matching NAKSHATRAS in zodiac.ts. */
export const NAKSHATRA_CATEGORY: NakshatraCategory[] = [
    'Swift',   // Ashwini
    'Fierce',  // Bharani
    'Mixed',   // Krittika
    'Fixed',   // Rohini
    'Gentle',  // Mrigashira
    'Sharp',   // Ardra
    'Movable', // Punarvasu
    'Swift',   // Pushya
    'Sharp',   // Ashlesha
    'Fierce',  // Magha
    'Fierce',  // Purva Phalguni
    'Fixed',   // Uttara Phalguni
    'Swift',   // Hasta
    'Gentle',  // Chitra
    'Movable', // Swati
    'Mixed',   // Vishakha
    'Gentle',  // Anuradha
    'Sharp',   // Jyeshtha
    'Sharp',   // Mula
    'Fierce',  // Purva Ashadha
    'Fixed',   // Uttara Ashadha
    'Movable', // Shravana
    'Movable', // Dhanishta
    'Movable', // Shatabhisha
    'Fierce',  // Purva Bhadrapada
    'Fixed',   // Uttara Bhadrapada
    'Gentle',  // Revati
];

export const CATEGORY_NOTE: Record<NakshatraCategory, string> = {
    Fixed: 'Steady. Traditionally used for anything meant to last.',
    Movable: 'Moving. Traditionally used for travel and for change.',
    Swift: 'Quick. Traditionally used for things that should be done and finished.',
    Gentle: 'Soft. Traditionally used for art, learning and repair.',
    Fierce: 'Forceful. Traditionally reserved for confrontation rather than beginnings.',
    Sharp: 'Cutting. Traditionally reserved for ending things rather than starting them.',
    Mixed: 'Mixed. Traditionally read as workable but not favoured.',
};

/* ── Intentions ─────────────────────────────────────────────────────────── */

export const INTENTIONS: Intention[] = [
    {
        key: 'begin',
        label: 'Begin something',
        blurb: 'A project, a habit, a piece of work you want to still be doing in a year.',
        prefers: ['Amrit', 'Shubh', 'Labh'],
        prefersCategories: ['Fixed', 'Swift'],
    },
    {
        key: 'conversation',
        label: 'A difficult conversation',
        blurb: 'Something that needs saying, where how it lands matters.',
        prefers: ['Amrit', 'Shubh'],
        prefersCategories: ['Gentle', 'Fixed'],
    },
    {
        key: 'travel',
        label: 'Travel',
        blurb: 'Setting out — the moment you leave, not the moment you arrive.',
        prefers: ['Char', 'Amrit', 'Labh'],
        prefersCategories: ['Movable', 'Swift'],
    },
    {
        key: 'study',
        label: 'Study or learning',
        blurb: 'Starting a course, sitting an exam, taking up something new.',
        prefers: ['Labh', 'Amrit', 'Shubh'],
        prefersCategories: ['Gentle', 'Fixed'],
    },
    {
        key: 'agreement',
        label: 'Signing or agreeing',
        blurb: 'A contract, an offer, anything you are committing your name to.',
        prefers: ['Labh', 'Amrit', 'Shubh'],
        prefersCategories: ['Fixed'],
    },
    {
        key: 'ceremony',
        label: 'A ceremony',
        blurb: 'Anything formal, marked, or done in front of people.',
        prefers: ['Shubh', 'Amrit'],
        prefersCategories: ['Fixed', 'Gentle'],
    },
];

export const INTENTION_BY_KEY = new Map(INTENTIONS.map((i) => [i.key, i]));

/* ── Putting it together ────────────────────────────────────────────────── */

export interface MuhuratWindow extends Choghadiya {
    /** True when this window is among those the chosen intention prefers. */
    suits: boolean;
    /** True when it overlaps Rahu Kaalam or Yamaganda. */
    clashes: boolean;
    /** Why it clashes, when it does. */
    clashReason?: string;
}

function overlaps(aStart: number, aEnd: number, bStart: string, bEnd: string): boolean {
    const s = Date.parse(bStart);
    const e = Date.parse(bEnd);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
    return aStart < e && aEnd > s;
}

/**
 * Mark each window against one intention and against the day's avoided periods.
 *
 * A window can both suit the intention and clash — Rahu Kaalam pays no
 * attention to the Choghadiya rotation — and the UI says so rather than picking
 * one. Two traditions disagreeing is a fact about the tradition, and hiding it
 * would be presenting a cleaner answer than exists.
 */
export function markWindows(
    windows: Choghadiya[],
    intention: Intention,
    avoid: { rahuKaalam: { start: string; end: string }; yamaganda: { start: string; end: string } }
): MuhuratWindow[] {
    return windows.map((w) => {
        const s = Date.parse(w.start);
        const e = Date.parse(w.end);

        const inRahu = overlaps(s, e, avoid.rahuKaalam.start, avoid.rahuKaalam.end);
        const inYama = overlaps(s, e, avoid.yamaganda.start, avoid.yamaganda.end);

        return {
            ...w,
            suits: intention.prefers.includes(w.name),
            clashes: inRahu || inYama,
            clashReason: inRahu
                ? 'Overlaps Rahu Kaalam'
                : inYama
                  ? 'Overlaps Yamaganda'
                  : undefined,
        };
    });
}
