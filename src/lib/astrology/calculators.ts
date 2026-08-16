/**
 * The three questions people type into a search box before they are ready for
 * a chart.
 *
 * Each is a real entry point rather than a teaser: the answer is given in full,
 * with the explanation, and the invitation to go further comes after it. A
 * calculator that withholds the number it promised in order to force a signup
 * is the pattern this is meant to be an alternative to.
 *
 * No ephemeris in this file's import chain, so the pages can read it directly.
 */

export type CalculatorTool = 'moon-sign' | 'ascendant' | 'nakshatra';

export interface CalculatorContent {
    tool: CalculatorTool;
    slug: string;
    /** Page heading. */
    title: string;
    /** The term as it is usually searched, for the metadata. */
    searchTitle: string;
    sanskrit: string;
    metaDescription: string;
    /** One paragraph under the heading, before the form. */
    intro: string;
    /** What the answer actually tells you. Shown with the result. */
    whatItMeans: string;
    /** Why this is not the whole picture — shown before the invitation. */
    theRest: string;
}

export const CALCULATORS: Record<CalculatorTool, CalculatorContent> = {
    'moon-sign': {
        tool: 'moon-sign',
        slug: 'moon-sign',
        title: 'Your Moon sign',
        searchTitle: 'Moon Sign (Rashi) Calculator',
        sanskrit: 'चन्द्र राशि',
        metaDescription:
            'Find your Vedic Moon sign — your rashi — from your birth date, time and place. Calculated with the same sidereal engine as a full chart, free and without an account.',
        intro:
            'In Vedic astrology the Moon sign carries most of what Western astrology assigns to the Sun. It is the sign the Moon occupied at the moment you were born, and it is what almost every traditional reading is built on — dashas, compatibility, Sade Sati all start here.',
        whatItMeans:
            'Your rashi describes the mind rather than the identity: how you take things in, what settles you, where your attention goes when nothing is demanding it. It is the most-used single fact in a Vedic chart.',
        theRest:
            'The Moon sign is one placement out of nine, and it sits in a house, in a nakshatra, under a running dasha — all of which change how it actually behaves.',
    },

    ascendant: {
        tool: 'ascendant',
        slug: 'ascendant',
        title: 'Your ascendant',
        searchTitle: 'Ascendant (Lagna) Calculator',
        sanskrit: 'लग्न',
        metaDescription:
            'Find your Vedic ascendant — your lagna — from your birth date, time and place. The sign rising on the eastern horizon at your birth, calculated sidereally.',
        intro:
            'The lagna is the sign that was rising on the eastern horizon where you were born. It changes roughly every two hours, which makes it the one placement that genuinely depends on your birth time — two people born the same day in the same city can have different ascendants.',
        whatItMeans:
            'The ascendant sets the frame of the whole chart: it decides which sign occupies each house, and therefore what every other planet is doing. It is usually read as the outward manner — how you meet things before you have thought about them.',
        theRest:
            'Because it moves so fast, an uncertain birth time is felt here first. If you are unsure to within an hour, treat the result as provisional.',
    },

    nakshatra: {
        tool: 'nakshatra',
        slug: 'nakshatra',
        title: 'Your nakshatra',
        searchTitle: 'Nakshatra and Pada Calculator',
        sanskrit: 'नक्षत्र',
        metaDescription:
            'Find your birth nakshatra and pada from your birth date, time and place. The 27-fold lunar division, its ruling planet, and which quarter your Moon falls in.',
        intro:
            'The 27 nakshatras divide the zodiac more finely than the twelve signs — each is a little over 13 degrees, and each is quartered again into padas. Your birth nakshatra is the one your Moon occupied, and its ruling planet is what starts your dasha sequence.',
        whatItMeans:
            'The nakshatra is the older layer of the system and often the more specific one. Its lord determines which planetary period you were born into, which is why this single fact decides the shape of your entire timeline.',
        theRest:
            'The pada matters as much as the nakshatra: the four quarters point to different divisional-chart positions, and readings that give the nakshatra without it are working at a quarter of the available resolution.',
    },
};

export const CALCULATOR_ORDER: CalculatorTool[] = ['moon-sign', 'ascendant', 'nakshatra'];
