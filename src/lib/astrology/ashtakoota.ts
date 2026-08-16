import { getNakshatra, getZodiacSign, ZODIAC_SIGNS } from './zodiac';

/**
 * Ashtakoota — the eight-fold matching, out of 36 points.
 *
 * /api/astrology/synastry has been calling itself compatibility while computing
 * exactly one thing: Tara Bala, one of the eight kutas below. Everything else
 * was handed to a language model as two raw charts, which means the "match" was
 * an AI's impression of a chart rather than a calculation — the precise inverse
 * of the house rule that a deterministic layer must produce facts before
 * anything interprets them.
 *
 * This is that layer. Nothing here interprets: it returns which kuta scored
 * what, out of what, and the classification each side fell into, so the reading
 * can be written from facts and a reader can check the arithmetic.
 *
 * ON THE VARIANTS. Several of these tables genuinely differ between
 * traditions — Vashya and Gana most of all, and authors disagree about whether
 * mutual-neutral Graha Maitri scores 3 or 4. Where that is true the value used
 * here is the one in common use, and `disputed` marks the kuta so the surface
 * can say so rather than presenting a contested number as settled. A matching
 * score that hides its own uncertainty is how 36 points ends up deciding
 * something it was never precise enough to decide.
 *
 * No ephemeris in this file's import chain — zodiac.ts is the deliberately
 * light module — so a client component can read the types without pulling the
 * 16.8 MB WASM behind them.
 */

export interface KutaScore {
    key: string;
    name: string;
    /** Points awarded. */
    score: number;
    /** Points available. */
    max: number;
    /** What each side was classified as, for the reader to check. */
    a: string;
    b: string;
    /** One line, factual: what the classification means. Not a verdict. */
    basis: string;
    /** True where traditions disagree about the table used. */
    disputed?: boolean;
}

export interface AshtakootaResult {
    kutas: KutaScore[];
    total: number;
    max: number;
    /** Present when either chart carries Mangal Dosha — a separate check. */
    mangal: { a: boolean; b: boolean; cancelled: boolean };
}

/* ─── Varna (1) ─────────────────────────────────────────────────────────── */

const VARNA_BY_SIGN: Record<string, string> = {
    Cancer: 'Brahmin', Scorpio: 'Brahmin', Pisces: 'Brahmin',
    Aries: 'Kshatriya', Leo: 'Kshatriya', Sagittarius: 'Kshatriya',
    Taurus: 'Vaishya', Virgo: 'Vaishya', Capricorn: 'Vaishya',
    Gemini: 'Shudra', Libra: 'Shudra', Aquarius: 'Shudra',
};

const VARNA_RANK: Record<string, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

/* ─── Vashya (2) ────────────────────────────────────────────────────────── */

const VASHYA_BY_SIGN: Record<string, string> = {
    Aries: 'Chatushpada', Taurus: 'Chatushpada', Gemini: 'Manava',
    Cancer: 'Jalachara', Leo: 'Vanachara', Virgo: 'Manava',
    Libra: 'Manava', Scorpio: 'Keeta', Sagittarius: 'Manava',
    Capricorn: 'Chatushpada', Aquarius: 'Manava', Pisces: 'Jalachara',
};

const VASHYA_ORDER = ['Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Keeta'];

/** Symmetric. Rows and columns follow VASHYA_ORDER. */
const VASHYA_MATRIX: number[][] = [
    /* Chatushpada */ [2, 1, 1, 0, 1],
    /* Manava      */ [1, 2, 0.5, 0, 1],
    /* Jalachara   */ [1, 0.5, 2, 1, 0.5],
    /* Vanachara   */ [0, 0, 1, 2, 0.5],
    /* Keeta       */ [1, 1, 0.5, 0.5, 2],
];

/* ─── Yoni (4) ──────────────────────────────────────────────────────────── */

const YONI_ANIMALS = [
    'Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat',
    'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion',
];

/** Nakshatra index (0-26) to its yoni animal. */
const YONI_BY_NAKSHATRA = [
    'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat', 'Sheep', 'Cat',
    'Rat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer',
    'Dog', 'Monkey', 'Mongoose', 'Monkey', 'Lion', 'Horse', 'Lion', 'Cow', 'Elephant',
];

/** The classical 14x14 grid, in YONI_ANIMALS order. Symmetric; 4 on the diagonal. */
const YONI_MATRIX: number[][] = [
    /* Horse    */ [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
    /* Elephant */ [2, 4, 3, 3, 3, 2, 2, 2, 3, 1, 2, 3, 2, 0],
    /* Sheep    */ [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
    /* Serpent  */ [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
    /* Dog      */ [2, 3, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
    /* Cat      */ [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
    /* Rat      */ [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
    /* Cow      */ [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
    /* Buffalo  */ [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
    /* Tiger    */ [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
    /* Deer     */ [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
    /* Monkey   */ [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
    /* Mongoose */ [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
    /* Lion     */ [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

/* ─── Graha Maitri (5) ──────────────────────────────────────────────────── */

const SIGN_LORD: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const FRIENDS: Record<string, string[]> = {
    Sun: ['Moon', 'Mars', 'Jupiter'],
    Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus'],
};

const ENEMIES: Record<string, string[]> = {
    Sun: ['Venus', 'Saturn'],
    Moon: [],
    Mars: ['Mercury'],
    Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'],
    Venus: ['Sun', 'Moon'],
    Saturn: ['Sun', 'Moon', 'Mars'],
};

type Relation = 'friend' | 'neutral' | 'enemy';

function relation(from: string, to: string): Relation {
    if (from === to) return 'friend';
    if (FRIENDS[from]?.includes(to)) return 'friend';
    if (ENEMIES[from]?.includes(to)) return 'enemy';
    return 'neutral';
}

function maitriScore(x: Relation, y: Relation): number {
    const pair = [x, y].sort().join('-');
    switch (pair) {
        case 'friend-friend': return 5;
        case 'friend-neutral': return 4;
        case 'neutral-neutral': return 3;
        case 'enemy-friend': return 1;
        case 'enemy-neutral': return 0.5;
        default: return 0; // enemy-enemy
    }
}

/* ─── Gana (6) ──────────────────────────────────────────────────────────── */

const GANA_BY_NAKSHATRA = [
    'Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya', 'Deva', 'Deva', 'Rakshasa',
    'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa',
    'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva',
];

function ganaScore(a: string, b: string): number {
    if (a === b) return 6;
    const pair = [a, b].sort().join('-');
    if (pair === 'Deva-Manushya') return 5;
    if (pair === 'Deva-Rakshasa') return 1;
    return 0; // Manushya-Rakshasa
}

/* ─── Nadi (8) ──────────────────────────────────────────────────────────── */

const NADI_BY_NAKSHATRA = [
    'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya',
    'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi',
    'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya',
];

/* ─── Tara (3) ──────────────────────────────────────────────────────────── */

/** Remainders 3, 5 and 7 are the inauspicious taras. 0 counts as 9. */
function taraAuspicious(fromIdx: number, toIdx: number): boolean {
    const count = ((toIdx - fromIdx + 27) % 27) + 1;
    const remainder = count % 9 === 0 ? 9 : count % 9;
    return ![3, 5, 7].includes(remainder);
}

/* ─── Bhakoot (7) ───────────────────────────────────────────────────────── */

/** The three afflicted pairs, by distance between Moon signs each way. */
const BHAKOOT_AFFLICTED = new Set(['6-8', '5-9', '2-12']);

/* ─── Mangal Dosha, cross-checked ───────────────────────────────────────── */

const MANGAL_HOUSES = [1, 4, 7, 8, 12];

function hasMangal(ascendant: number, marsLongitude: number | undefined): boolean {
    if (marsLongitude === undefined) return false;
    const ascSign = Math.floor(ascendant / 30);
    const marsSign = Math.floor(marsLongitude / 30);
    return MANGAL_HOUSES.includes(((marsSign - ascSign + 12) % 12) + 1);
}

/* ─── The calculation ───────────────────────────────────────────────────── */

interface ChartLike {
    ascendant: number;
    planets: Record<string, { longitude: number }>;
}

/**
 * Score two charts against each other.
 *
 * `a` and `b` rather than bride and groom. Varna and Tara are the only kutas
 * whose classical form is asymmetric, and both are computed here in the
 * direction that does not assume which partner is which — Varna compares ranks
 * and awards the point when A's is at least B's, which is the traditional rule
 * with the gendered framing removed rather than reversed.
 */
export function calculateAshtakoota(chartA: ChartLike, chartB: ChartLike): AshtakootaResult {
    const moonA = chartA.planets['Moon']?.longitude ?? 0;
    const moonB = chartB.planets['Moon']?.longitude ?? 0;

    const signA = getZodiacSign(moonA);
    const signB = getZodiacSign(moonB);
    const nakA = getNakshatra(moonA);
    const nakB = getNakshatra(moonB);

    const kutas: KutaScore[] = [];

    // 1. Varna
    const varnaA = VARNA_BY_SIGN[signA] ?? 'Shudra';
    const varnaB = VARNA_BY_SIGN[signB] ?? 'Shudra';
    kutas.push({
        key: 'varna',
        name: 'Varna',
        score: VARNA_RANK[varnaA] >= VARNA_RANK[varnaB] ? 1 : 0,
        max: 1,
        a: varnaA,
        b: varnaB,
        basis: 'Temperament grouping taken from each Moon sign.',
    });

    // 2. Vashya
    const vashyaA = VASHYA_BY_SIGN[signA] ?? 'Manava';
    const vashyaB = VASHYA_BY_SIGN[signB] ?? 'Manava';
    kutas.push({
        key: 'vashya',
        name: 'Vashya',
        score: VASHYA_MATRIX[VASHYA_ORDER.indexOf(vashyaA)][VASHYA_ORDER.indexOf(vashyaB)],
        max: 2,
        a: vashyaA,
        b: vashyaB,
        basis: 'How much natural sway each sign holds over the other.',
        disputed: true,
    });

    // 3. Tara
    const taraAB = taraAuspicious(nakA.index, nakB.index);
    const taraBA = taraAuspicious(nakB.index, nakA.index);
    kutas.push({
        key: 'tara',
        name: 'Tara',
        score: taraAB && taraBA ? 3 : taraAB || taraBA ? 1.5 : 0,
        max: 3,
        a: taraAB ? 'Favourable' : 'Unfavourable',
        b: taraBA ? 'Favourable' : 'Unfavourable',
        basis: 'Counted between the two birth nakshatras, in both directions.',
    });

    // 4. Yoni
    const yoniA = YONI_BY_NAKSHATRA[nakA.index];
    const yoniB = YONI_BY_NAKSHATRA[nakB.index];
    kutas.push({
        key: 'yoni',
        name: 'Yoni',
        score: YONI_MATRIX[YONI_ANIMALS.indexOf(yoniA)][YONI_ANIMALS.indexOf(yoniB)],
        max: 4,
        a: yoniA,
        b: yoniB,
        basis: 'The animal assigned to each birth nakshatra, and how the pair sit together.',
    });

    // 5. Graha Maitri
    const lordA = SIGN_LORD[signA];
    const lordB = SIGN_LORD[signB];
    const relAB = relation(lordA, lordB);
    const relBA = relation(lordB, lordA);
    kutas.push({
        key: 'maitri',
        name: 'Graha Maitri',
        score: maitriScore(relAB, relBA),
        max: 5,
        a: `${lordA} (${relAB} to ${lordB})`,
        b: `${lordB} (${relBA} to ${lordA})`,
        basis: 'Natural friendship between the two Moon sign rulers.',
        disputed: true,
    });

    // 6. Gana
    const ganaA = GANA_BY_NAKSHATRA[nakA.index];
    const ganaB = GANA_BY_NAKSHATRA[nakB.index];
    kutas.push({
        key: 'gana',
        name: 'Gana',
        score: ganaScore(ganaA, ganaB),
        max: 6,
        a: ganaA,
        b: ganaB,
        basis: 'Disposition grouping carried by each birth nakshatra.',
        disputed: true,
    });

    // 7. Bhakoot
    const idxA = ZODIAC_SIGNS.indexOf(signA);
    const idxB = ZODIAC_SIGNS.indexOf(signB);
    const fwd = ((idxB - idxA + 12) % 12) + 1;
    const back = ((idxA - idxB + 12) % 12) + 1;
    const pairKey = [fwd, back].sort((x, y) => x - y).join('-');
    kutas.push({
        key: 'bhakoot',
        name: 'Bhakoot',
        score: BHAKOOT_AFFLICTED.has(pairKey) ? 0 : 7,
        max: 7,
        a: signA,
        b: signB,
        basis: `The Moon signs stand ${fwd} and ${back} from each other.`,
    });

    // 8. Nadi
    const nadiA = NADI_BY_NAKSHATRA[nakA.index];
    const nadiB = NADI_BY_NAKSHATRA[nakB.index];
    kutas.push({
        key: 'nadi',
        name: 'Nadi',
        score: nadiA === nadiB ? 0 : 8,
        max: 8,
        a: nadiA,
        b: nadiB,
        basis: 'Constitutional current of each birth nakshatra. Traditionally the heaviest single kuta.',
    });

    const mangalA = hasMangal(chartA.ascendant, chartA.planets['Mars']?.longitude);
    const mangalB = hasMangal(chartB.ascendant, chartB.planets['Mars']?.longitude);

    return {
        kutas,
        total: kutas.reduce((sum, k) => sum + k.score, 0),
        max: kutas.reduce((sum, k) => sum + k.max, 0),
        mangal: {
            a: mangalA,
            b: mangalB,
            // Both carrying it is the classical cancellation, and it is the part
            // most often left out of a reading that has something to sell.
            cancelled: mangalA && mangalB,
        },
    };
}
