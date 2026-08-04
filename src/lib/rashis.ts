/**
 * The twelve rashis (Vedic zodiac signs).
 *
 * Single source shared by the homepage medallion grid and the /rashi/[sign]
 * detail pages, so the artwork path, naming and framing can never drift apart.
 *
 * Attributes are standard Parashari reference data — ruling graha, tattva
 * (element), and quality — not interpretation. The `trait` and `about` copy is
 * archetypal: what the pattern tends to look like, never what will happen. No
 * dates are listed on purpose: sun-sign date ranges are tropical Western, and
 * this is a sidereal system where they would simply be wrong.
 */

export type Rashi = {
    /** URL slug, e.g. "mesha" -> /rashi/mesha */
    slug: string;
    /** Sanskrit name */
    sa: string;
    /** Common English name */
    en: string;
    symbol: string;
    /** Date range string */
    dateRange: string;
    /** Daily guidance snippet */
    dailyQuote: string;
    /** Ruling graha, Sanskrit with English in parentheses */
    ruler: string;
    /** Tattva */
    element: 'Fire' | 'Earth' | 'Air' | 'Water';
    /** Chara (movable), Sthira (fixed), Dvisvabhava (dual) */
    quality: string;
    /** One-line archetype for the medallion card */
    trait: string;
    /** Two or three sentences for the detail page */
    about: string;
};

export const RASHIS: Rashi[] = [
    {
        slug: 'mesha', sa: 'Mesha', en: 'Aries', symbol: 'Ram',
        dateRange: 'MAR 21 - APR 19',
        dailyQuote: 'Where action gathers before a certainty arrives. Move, then listen.',
        ruler: 'Mangala (Mars)', element: 'Fire', quality: 'Chara (movable)',
        trait: 'Initiation, momentum, the urge to begin.',
        about: 'Mesha is the impulse that starts things. Where it sits in a chart tends to show where a person moves first and asks questions later — quick to commit, quick to act, and often impatient with deliberation. Its difficulty is rarely courage; it is staying with something once the initial charge has gone.',
    },
    {
        slug: 'vrishabha', sa: 'Vrishabha', en: 'Taurus', symbol: 'Bull',
        dateRange: 'APR 20 - MAY 20',
        dailyQuote: 'The long hold. Build slowly and stay grounded in what endures.',
        ruler: 'Shukra (Venus)', element: 'Earth', quality: 'Sthira (fixed)',
        trait: 'Steadiness, the senses, the long hold.',
        about: 'Vrishabha is the capacity to stay. It tends to mark the areas of life a person builds slowly and then refuses to give up, with a strong pull toward comfort, beauty and the material world. Its strength and its stubbornness are the same quality seen from different sides.',
    },
    {
        slug: 'mithuna', sa: 'Mithuna', en: 'Gemini', symbol: 'Twins',
        dateRange: 'MAY 21 - JUN 20',
        dailyQuote: 'Curiosity in motion. Range over rush, depth chosen with care.',
        ruler: 'Budha (Mercury)', element: 'Air', quality: 'Dvisvabhava (dual)',
        trait: 'Curiosity, exchange, many threads at once.',
        about: 'Mithuna is the mind in motion — gathering, comparing, talking, connecting. It often shows where a person holds several possibilities open rather than settling on one. The gift is range; the cost is that depth has to be chosen deliberately rather than arrived at.',
    },
    {
        slug: 'karka', sa: 'Karka', en: 'Cancer', symbol: 'Crab',
        dateRange: 'JUN 21 - JUL 22',
        dailyQuote: 'Memory and shelter. Protect what matters without fear of tomorrow.',
        ruler: 'Chandra (Moon)', element: 'Water', quality: 'Chara (movable)',
        trait: 'Memory, shelter, the protective instinct.',
        about: 'Karka holds what matters. It tends to mark where a person feels most, remembers longest, and moves to protect first. Ruled by the Moon, it is responsive by nature — which is why the same placement can read as deep care or as difficulty letting a thing go.',
    },
    {
        slug: 'simha', sa: 'Simha', en: 'Leo', symbol: 'Lion',
        dateRange: 'JUL 23 - AUG 22',
        dailyQuote: 'Presence and authorship. Stand in your light with generous heart.',
        ruler: 'Surya (Sun)', element: 'Fire', quality: 'Sthira (fixed)',
        trait: 'Presence, authorship, the need to be seen.',
        about: 'Simha is the wish to be the author of one\'s own life. It often marks where a person wants their contribution recognised rather than absorbed into a group. Generous when secure, brittle when unacknowledged — and the difference between those two is usually context, not character.',
    },
    {
        slug: 'kanya', sa: 'Kanya', en: 'Virgo', symbol: 'Maiden',
        dateRange: 'AUG 23 - SEP 22',
        dailyQuote: 'Discernment and craft. Notice the vital detail that clears the way.',
        ruler: 'Budha (Mercury)', element: 'Earth', quality: 'Dvisvabhava (dual)',
        trait: 'Discernment, refinement, the useful detail.',
        about: 'Kanya notices what is off. It tends to show where a person improves, corrects and makes things work, with real pleasure in craft and precision. The same acuity turned inward becomes self-criticism, which is the pattern most worth watching here.',
    },
    {
        slug: 'tula', sa: 'Tula', en: 'Libra', symbol: 'Scales',
        dateRange: 'SEP 23 - OCT 22',
        dailyQuote: 'Balance and relation. Weigh with clarity, then step forward.',
        ruler: 'Shukra (Venus)', element: 'Air', quality: 'Chara (movable)',
        trait: 'Balance, relation, the weighing of two sides.',
        about: 'Tula thinks in relationship. It often marks where a person considers the other party before deciding, and where fairness matters more than winning. Weighing is its strength; the difficulty is that a scale in constant motion can struggle to come to rest.',
    },
    {
        slug: 'vrishchika', sa: 'Vrishchika', en: 'Scorpio', symbol: 'Scorpion',
        dateRange: 'OCT 23 - NOV 21',
        dailyQuote: 'Depth beneath the surface. Trust transformation over control.',
        ruler: 'Mangala (Mars)', element: 'Water', quality: 'Sthira (fixed)',
        trait: 'Depth, intensity, what stays beneath.',
        about: 'Vrishchika goes under the surface. It tends to mark where a person is private, researching, and unwilling to accept the stated version of things. Capable of real transformation, and equally capable of holding on to what should have been released.',
    },
    {
        slug: 'dhanu', sa: 'Dhanu', en: 'Sagittarius', symbol: 'Archer',
        dateRange: 'NOV 22 - DEC 21',
        dailyQuote: 'The far horizon. Aim for true principle and expanding awareness.',
        ruler: 'Guru (Jupiter)', element: 'Fire', quality: 'Dvisvabhava (dual)',
        trait: 'Search, meaning, the far horizon.',
        about: 'Dhanu aims at something beyond the immediate. It often shows where a person seeks meaning, teaching, travel or principle, and where they are least willing to be confined. The arrow needs a target; without one the same energy becomes restlessness.',
    },
    {
        slug: 'makara', sa: 'Makara', en: 'Capricorn', symbol: 'Sea-goat',
        dateRange: 'DEC 22 - JAN 19',
        dailyQuote: 'Structure and patience. The steady climb that lasts for years.',
        ruler: 'Shani (Saturn)', element: 'Earth', quality: 'Chara (movable)',
        trait: 'Structure, patience, the slow climb.',
        about: 'Makara builds over time. It tends to mark where a person accepts delay, does the unglamorous work, and measures progress in years rather than weeks. Saturn\'s discipline is its strength; its cost is a tendency to postpone rest until the work is finished, which it never quite is.',
    },
    {
        slug: 'kumbha', sa: 'Kumbha', en: 'Aquarius', symbol: 'Water-bearer',
        dateRange: 'JAN 20 - FEB 18',
        dailyQuote: 'The wider system. Distance brings vision and collective purpose.',
        ruler: 'Shani (Saturn)', element: 'Air', quality: 'Sthira (fixed)',
        trait: 'Distance, system, the wider pattern.',
        about: 'Kumbha steps back far enough to see the structure. It often marks where a person thinks in groups, systems and long horizons rather than personal preference. The perspective is genuinely useful; the risk is observing a life from a distance instead of being inside it.',
    },
    {
        slug: 'meena', sa: 'Meena', en: 'Pisces', symbol: 'Fishes',
        dateRange: 'FEB 19 - MAR 20',
        dailyQuote: 'The porous edge. Compassion without boundary, quiet wisdom.',
        ruler: 'Guru (Jupiter)', element: 'Water', quality: 'Dvisvabhava (dual)',
        trait: 'Dissolution, empathy, the porous edge.',
        about: 'Meena is where the boundary thins. It tends to show where a person absorbs the mood of a room, imagines easily, and finds hard edges difficult to maintain. Compassionate and creative at its best; at its most difficult, unsure which feelings in the room are actually theirs.',
    },
];

export const rashiBySlug = (slug: string): Rashi | undefined =>
    RASHIS.find((r) => r.slug === slug);

/** Artwork path for a rashi. Transparent PNG, 600x600. */
export const rashiArt = (r: Rashi) => `/art/rashi/${r.slug}.png`;
