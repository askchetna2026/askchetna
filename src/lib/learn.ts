/**
 * A spine for material that already exists.
 *
 * The pieces were all there — /explore, /glossary, /how-we-calculate, twelve
 * rashi pages, the four landing pages, and now /patterns and the calculators —
 * and none of them knew about each other. A visitor could land on any one and
 * had no way to tell what came before it, what came after, or whether they were
 * looking at the beginning or the middle.
 *
 * So this file adds ordering rather than content. Nothing here is new writing;
 * every entry points at a page that already ships. Where a link is to a page
 * that needs a signed-in chart, `needsChart` says so, because sending a curious
 * stranger into a login wall is how a learning path loses them at step two.
 *
 * No imports at all, deliberately — this is read by a static page.
 */

export type Level = 'start' | 'foundation' | 'timing' | 'depth' | 'reference';

export interface LearnEntry {
    title: string;
    /** One line. What a reader gets, not what the page is called. */
    blurb: string;
    href: string;
    /** Rough reading time in minutes, for entries long enough to need one. */
    minutes?: number;
    /** True when the page needs birth details to say anything. */
    needsChart?: boolean;
}

export interface LearnSection {
    level: Level;
    title: string;
    /** Why this stage exists, in the reader's terms. */
    intro: string;
    entries: LearnEntry[];
}

export const CURRICULUM: LearnSection[] = [
    {
        level: 'start',
        title: 'Start here',
        intro:
            'Two pages that between them explain what this is and what it refuses to do. Everything else assumes them.',
        entries: [
            {
                title: 'What AskChetna is',
                blurb:
                    'The twelve rashis, the nine grahas, and what “patterns, not predictions” means once it stops being a slogan.',
                href: '/explore',
                minutes: 6,
            },
            {
                title: 'How we calculate',
                blurb:
                    'The sidereal zodiac, the Lahiri ayanamsa, the ephemeris behind every figure, and what happens when a birth time is unknown.',
                href: '/how-we-calculate',
                minutes: 5,
            },
        ],
    },
    {
        level: 'foundation',
        title: 'The pieces a chart is made of',
        intro:
            'A Vedic chart is four things layered: a sign, a house, a planet and a nakshatra. Learn them in that order and the rest stops looking arbitrary.',
        entries: [
            {
                title: 'The twelve rashis',
                blurb:
                    'Each sign, its ruling graha, and the trait it describes — as a tendency rather than a personality test.',
                href: '/rashi/mesha',
                minutes: 3,
            },
            {
                title: 'Find your Moon sign',
                blurb:
                    'In Vedic astrology the Moon carries what Western astrology gives the Sun. This is the single most-used fact in a chart.',
                href: '/calculators/moon-sign',
                minutes: 2,
            },
            {
                title: 'Find your ascendant',
                blurb:
                    'The sign rising when you were born. It decides which sign sits on every house, so it frames everything else.',
                href: '/calculators/ascendant',
                minutes: 2,
            },
            {
                title: 'Find your nakshatra',
                blurb:
                    'The older, finer division — 27 of them, quartered into padas. Its lord starts your whole dasha sequence.',
                href: '/calculators/nakshatra',
                minutes: 2,
            },
            {
                title: 'Your own chart',
                blurb:
                    'All of the above at once, plus the houses, the divisional charts and what the engine reads in them.',
                href: '/chart',
                needsChart: true,
            },
        ],
    },
    {
        level: 'timing',
        title: 'Timing',
        intro:
            'The part that distinguishes Jyotisa from most other systems: it says when, not just what. Dashas are the backbone; transits move across them.',
        entries: [
            {
                title: 'What a dasha is',
                blurb:
                    'The planetary periods that divide a life into chapters, and why two people in the same one are not living the same year.',
                href: '/dasha-timeline',
                minutes: 5,
            },
            {
                title: 'Your own timeline',
                blurb:
                    'The chapter you are in now, the sub-period inside it, and what is moving across your chart today.',
                href: '/timing',
                needsChart: true,
            },
            {
                title: 'Sade Sati, Mangal Dosha, Kala Sarpa',
                blurb:
                    'The three terms people meet first, usually somewhere that wanted them worried. Whether each applies to you, and what moderates it.',
                href: '/patterns',
                needsChart: true,
            },
        ],
    },
    {
        level: 'depth',
        title: 'Going further',
        intro:
            'Where the same chart starts answering narrower questions. None of this is needed to read the pages above.',
        entries: [
            {
                title: 'Relationships',
                blurb:
                    'What two charts say about the dynamic between them — dealt with as a pattern to understand, not a score to pass.',
                href: '/relationship-astrology',
                minutes: 4,
            },
            {
                title: 'Career and work',
                blurb: 'The houses and periods that speak to work, and what they can honestly clarify.',
                href: '/career-astrology',
                minutes: 4,
            },
            {
                title: 'Ask a question',
                blurb:
                    'Put something specific to the chart rather than reading it in general. The answer cites the placements it used.',
                href: '/clarity',
                needsChart: true,
            },
        ],
    },
    {
        level: 'reference',
        title: 'Reference',
        intro: 'For looking things up rather than reading through.',
        entries: [
            {
                title: 'Glossary',
                blurb:
                    'Fifteen terms in plain language — ascendant, dasha, nakshatra, pada, dignity and the rest — each with what it means in your own chart.',
                href: '/glossary',
            },
            {
                title: 'Journal',
                blurb:
                    'Write what you notice. Each entry records the period it was written in, which is what lets you compare a reading against the life.',
                href: '/journal',
            },
            {
                title: 'Writing',
                blurb: 'Longer pieces, as they are published.',
                href: '/blog',
            },
        ],
    },
];
