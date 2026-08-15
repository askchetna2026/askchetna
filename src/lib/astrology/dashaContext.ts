import { getZodiacSign, getNakshatra, type ChartData } from './zodiac';

/**
 * What a dasha lord is actually doing in THIS chart.
 *
 * /timing described the current period from a lookup table keyed on the lord's
 * name alone — nine possible paragraphs for the entire user base. Everyone in a
 * Jupiter mahadasha read the same "season of growth, learning and expansion",
 * whether their Jupiter sat exalted in the 9th or debilitated in the 6th. The
 * page was answering "what does Jupiter mean" when the seeker was asking "what
 * does MY Jupiter mean".
 *
 * Every fact below is read off the stored chart. Nothing here is generated, so
 * it costs no model call and works offline; the AI insight remains the layer
 * above this, for synthesis rather than facts.
 *
 * Imports from './zodiac' and never './calculator' — this is reached from a
 * client component, and calculator.ts drags the 16.8 MB ephemeris into the
 * bundle. There is an eslint rule enforcing that; this comment is why.
 */

/** What each house is the department of, in plain language. */
const HOUSE_DOMAIN: Record<number, string> = {
    1: 'your body, temperament and how you meet the world',
    2: 'money, possessions, family and what you value',
    3: 'courage, siblings, skill and short journeys',
    4: 'home, mother, land and inner security',
    5: 'creativity, children, romance and speculation',
    6: 'work, service, health, debt and rivals',
    7: 'partnership, marriage and open dealings with others',
    8: 'shared resources, upheaval, research and the hidden',
    9: 'belief, teachers, fortune and long journeys',
    10: 'career, public standing and what you are known for',
    11: 'gains, networks, elder siblings and fulfilled desires',
    12: 'loss, retreat, foreign places, sleep and release',
};

/**
 * How a dignity changes the reading.
 *
 * Deliberately about ease rather than good and bad. A debilitated lord is not a
 * bad period — it is one where the results come through effort rather than
 * naturally, which is a different and more useful thing to tell someone.
 */
const DIGNITY_NOTE: Record<string, string> = {
    Exalted: 'It is exalted there, so this area tends to move with unusual ease during the period.',
    'Own Sign': 'It is in its own sign, so it operates on home ground here — steady rather than dramatic.',
    'Great Friend': 'It sits with a strong ally, so support in this area tends to arrive from other people.',
    Friend: 'It is comfortable here, and this area generally cooperates.',
    Neutral: 'It is neither helped nor hindered here, so outcomes follow your own effort closely.',
    Enemy: 'It sits in difficult territory, so this area asks for more patience than it gives back at first.',
    'Great Enemy': 'It is under strain here, so progress in this area comes through persistence rather than flow.',
    Debilitated: 'It is debilitated there, which does not make the period bad — it means results come through effort and correction rather than naturally.',
};

export interface DashaLordContext {
    lord: string;
    house: number | null;
    sign: string | null;
    nakshatra: string | null;
    dignity: string | null;
    isRetrograde: boolean;
    /** One or two sentences, true of this chart specifically. */
    placement: string | null;
    /** The life area the period is most likely to be felt in. */
    domain: string | null;
}

/**
 * Read the lord's placement out of a stored chart.
 *
 * Returns nulls rather than guesses when the chart predates a field. A missing
 * house should show less, never a fabricated placement — the whole point of
 * this module is that what it says is verifiably true of the seeker's chart.
 */
export function describeDashaLord(chartData: ChartData | null | undefined, lord: string): DashaLordContext {
    const empty: DashaLordContext = {
        lord, house: null, sign: null, nakshatra: null,
        dignity: null, isRetrograde: false, placement: null, domain: null,
    };

    const planet = chartData?.planets?.[lord];
    if (!planet || typeof planet.longitude !== 'number') return empty;

    // Rahu and Ketu never retrograde in the sense the flag implies, and they
    // have no dignity in classical terms — reporting either would be noise.
    const isNode = lord === 'Rahu' || lord === 'Ketu';

    const house = typeof planet.house === 'number' ? planet.house : null;
    const sign = getZodiacSign(planet.longitude) || null;
    const nakshatra = getNakshatra(planet.longitude)?.name ?? null;
    const dignity = isNode ? null : (planet.dignity ?? null);
    const domain = house ? HOUSE_DOMAIN[house] ?? null : null;

    const parts: string[] = [];

    if (house && sign) {
        parts.push(`Your ${lord} sits in the ${ordinal(house)} house in ${sign} — ${domain}.`);
    } else if (sign) {
        parts.push(`Your ${lord} is in ${sign}.`);
    }

    if (dignity && DIGNITY_NOTE[dignity]) {
        parts.push(DIGNITY_NOTE[dignity]);
    }

    if (!isNode && planet.isRetrograde) {
        parts.push(`It is retrograde, so this period tends to revisit and rework ${house ? 'this area' : 'old ground'} rather than break new soil.`);
    }

    return {
        lord, house, sign, nakshatra, dignity,
        isRetrograde: Boolean(planet.isRetrograde) && !isNode,
        placement: parts.length ? parts.join(' ') : null,
        domain,
    };
}

function ordinal(n: number): string {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
}
