import { getZodiacSign, ZODIAC_SIGNS } from './zodiac';
import type { ChartData } from './zodiac';

/**
 * Prakriti — constitutional tendency — read from the birth chart.
 *
 * A NOTE ON METHOD, because this one deserves it. Ayurveda normally establishes
 * prakriti by assessment: a practitioner observes, or a person answers thirty
 * questions about their frame, digestion and sleep. Deriving it from the chart
 * instead is a Jyotisa-Ayurveda practice with real lineage, and it is also
 * genuinely contested — plenty of practitioners hold that only observation
 * settles it, and the graha-to-dosha table below is not the only one in use.
 *
 * That is exactly why every contribution is returned rather than a bare answer.
 * The page shows which factor gave which points, so someone who reads the
 * tradition differently can see precisely where they part company instead of
 * being handed a verdict. A contested method presented transparently is
 * defensible; the same method presented as fact is not.
 *
 * THE BOUNDARY, which is not negotiable. Nothing here diagnoses anything,
 * prescribes anything, or recommends a diet, a herb or a treatment. Prakriti is
 * described as a set of tendencies someone may recognise in themselves. That
 * limit is the catalogue's own — "must not diagnose disease, prescribe
 * treatment or present constitution as medical advice" — and it is also what
 * keeps this out of the health-claims territory both app stores scrutinise.
 *
 * No ephemeris in the import chain, so the page can read the types directly.
 */

export type Dosha = 'Vata' | 'Pitta' | 'Kapha';

export const DOSHAS: Dosha[] = ['Vata', 'Pitta', 'Kapha'];

export interface DoshaContent {
    sanskrit: string;
    /** The two elements it is composed of. */
    elements: string;
    /** One line, the shape of it. */
    summary: string;
    /** Tendencies someone may recognise. Never symptoms. */
    recognise: string[];
    /** What the tradition says goes out of balance first. Framed as a pattern. */
    whenStretched: string;
}

/**
 * Written as tendencies, deliberately.
 *
 * Every line here describes how someone might recognise themselves, not what is
 * wrong with them. No symptom, no remedy, no food, no herb — the moment this
 * vocabulary turns into "you should eat" or "this indicates", it stops being a
 * reflective frame and becomes medical advice given by a chart.
 */
export const DOSHA_CONTENT: Record<Dosha, DoshaContent> = {
    Vata: {
        sanskrit: 'वात',
        elements: 'Air and ether',
        summary: 'Movement. Quick to start, quick to change, lighter on the ground.',
        recognise: [
            'Ideas arrive faster than they can be finished',
            'Enthusiasm that runs ahead of routine',
            'Rest and appetite that vary rather than keep to a schedule',
            'Warmth and steadiness feel restorative',
        ],
        whenStretched:
            'Under strain the tradition describes Vata as scattering — several things begun, attention hard to settle. The countermeasure it names is rhythm rather than effort.',
    },
    Pitta: {
        sanskrit: 'पित्त',
        elements: 'Fire and water',
        summary: 'Transformation. Focused, decisive, and warm in both senses.',
        recognise: [
            'A strong sense of how things ought to be done',
            'Comfortable making the decision nobody else will',
            'Sharp focus that does not like being interrupted',
            'Coolness and space feel restorative',
        ],
        whenStretched:
            'Under strain the tradition describes Pitta as sharpening — impatience with people working at another pace. What it names as the counterweight is deliberately slowing the tempo, not pushing harder.',
    },
    Kapha: {
        sanskrit: 'कफ',
        elements: 'Earth and water',
        summary: 'Cohesion. Steady, durable, and slower to be moved.',
        recognise: [
            'Endurance that outlasts faster starters',
            'Loyalty to people and to routines',
            'A dislike of being hurried into a decision',
            'Movement and variety feel restorative',
        ],
        whenStretched:
            'Under strain the tradition describes Kapha as settling — staying with what is comfortable past the point it is useful. What it names is stimulation and change, not rest.',
    },
};

/**
 * Graha to dosha.
 *
 * The mapping most commonly given in Jyotisa-Ayurveda texts, by the elements
 * each graha is held to carry: Vata is air and ether, Pitta fire, Kapha water
 * and earth. Rahu and Ketu are included because a chart without them is not a
 * chart, though their assignment is the least settled part of the table.
 */
export const GRAHA_DOSHA: Record<string, Dosha> = {
    Saturn: 'Vata',
    Rahu: 'Vata',
    Mercury: 'Vata',
    Sun: 'Pitta',
    Mars: 'Pitta',
    Ketu: 'Pitta',
    Moon: 'Kapha',
    Venus: 'Kapha',
    Jupiter: 'Kapha',
};

/** Rashi to dosha, by the element of the sign. */
export const RASHI_DOSHA: Record<string, Dosha> = {
    Aries: 'Pitta', Leo: 'Pitta', Sagittarius: 'Pitta',
    Gemini: 'Vata', Libra: 'Vata', Aquarius: 'Vata',
    Taurus: 'Kapha', Virgo: 'Kapha', Capricorn: 'Kapha',
    Cancer: 'Kapha', Scorpio: 'Kapha', Pisces: 'Kapha',
};

const SIGN_LORD: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

export interface Contribution {
    /** What was looked at. */
    factor: string;
    /** What was found. */
    found: string;
    dosha: Dosha;
    points: number;
    /** Why this factor counts for what it does. */
    why: string;
}

export interface PrakritiResult {
    scores: Record<Dosha, number>;
    total: number;
    /** Highest scoring. */
    primary: Dosha;
    /** Second, when it is close enough to matter — a dual constitution. */
    secondary: Dosha | null;
    /** True when the top two are within a point of each other. */
    dual: boolean;
    contributions: Contribution[];
}

/**
 * The four factors, and why these four.
 *
 * The ascendant and its lord carry the most weight because the first house is
 * the body in every reading of a chart — which is the whole reason a
 * constitutional question is asked of it at all. The Moon is weighted lower and
 * included because prakriti is temperament as well as build. Planets sitting in
 * the first house are counted individually, since a graha in the first is the
 * one placement everyone agrees colours the physical self.
 */
const WEIGHT = {
    ascendant: 3,
    ascendantLord: 3,
    moon: 2,
    firstHousePlanet: 2,
} as const;

export function calculatePrakriti(chart: ChartData): PrakritiResult | null {
    const ascendant = chart?.ascendant;
    if (typeof ascendant !== 'number') return null;

    const contributions: Contribution[] = [];
    const scores: Record<Dosha, number> = { Vata: 0, Pitta: 0, Kapha: 0 };

    const add = (c: Contribution) => {
        contributions.push(c);
        scores[c.dosha] += c.points;
    };

    // 1. The rising sign.
    const ascSign = getZodiacSign(ascendant);
    const ascDosha = RASHI_DOSHA[ascSign];
    if (ascDosha) {
        add({
            factor: 'Rising sign',
            found: ascSign,
            dosha: ascDosha,
            points: WEIGHT.ascendant,
            why: 'The first house is read as the body, so the sign on it carries the most weight here.',
        });
    }

    // 2. Its ruler.
    const lord = SIGN_LORD[ascSign];
    const lordDosha = lord ? GRAHA_DOSHA[lord] : undefined;
    if (lord && lordDosha) {
        add({
            factor: 'Ruler of the rising sign',
            found: lord,
            dosha: lordDosha,
            points: WEIGHT.ascendantLord,
            why: `${lord} governs ${ascSign}, so its nature is read into the body it rules.`,
        });
    }

    // 3. The Moon — temperament rather than build.
    const moonLongitude = chart.planets?.Moon?.longitude;
    if (typeof moonLongitude === 'number') {
        const moonSign = getZodiacSign(moonLongitude);
        const moonDosha = RASHI_DOSHA[moonSign];
        if (moonDosha) {
            add({
                factor: 'Moon sign',
                found: moonSign,
                dosha: moonDosha,
                points: WEIGHT.moon,
                why: 'Prakriti describes temperament as well as build, and the Moon is the mind.',
            });
        }
    }

    // 4. Anything standing in the first house.
    const ascSignIndex = Math.floor(ascendant / 30);
    for (const [name, position] of Object.entries(chart.planets ?? {})) {
        const longitude = position?.longitude;
        if (typeof longitude !== 'number') continue;

        const house = ((Math.floor(longitude / 30) - ascSignIndex + 12) % 12) + 1;
        if (house !== 1) continue;

        const dosha = GRAHA_DOSHA[name];
        if (!dosha) continue;

        add({
            factor: 'In the first house',
            found: `${name} in ${ZODIAC_SIGNS[Math.floor(longitude / 30)]}`,
            dosha,
            points: WEIGHT.firstHousePlanet,
            why: 'A graha standing in the first house is held to colour the physical self directly.',
        });
    }

    const total = scores.Vata + scores.Pitta + scores.Kapha;
    if (total === 0) return null;

    const ranked = [...DOSHAS].sort((a, b) => scores[b] - scores[a]);
    const primary = ranked[0];
    const runnerUp = ranked[1];

    // Within a point is a tie in everything but name. Ayurveda has always
    // recognised dual constitutions, and rounding one away to declare a single
    // winner would be the least honest thing this file could do.
    const dual = scores[primary] - scores[runnerUp] <= 1;

    return {
        scores,
        total,
        primary,
        secondary: dual ? runnerUp : null,
        dual,
        contributions,
    };
}
