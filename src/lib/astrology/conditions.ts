/**
 * The four chart conditions people arrive already frightened of, explained.
 *
 * Deliberately free of any import that reaches the ephemeris. `engine.ts` pulls
 * in `calculator.ts`, which loads a 16.8 MB WASM ephemeris that must never enter
 * a client bundle — so the shared type and all the words live here instead, and
 * a component can import from this file without dragging swisseph behind it.
 *
 * The split is also the point of the refactor. Detection decides whether a
 * condition applies and returns the placements it rests on; everything about
 * what that MEANS is below, where it can be reworded, translated or reviewed by
 * someone who does not touch calculation code.
 *
 * House rule for this file: no fear, and no fear-driven upsell. Sade Sati and
 * Mangal Dosha are the terms people search when they are worried, and the
 * results they find elsewhere are frequently written to sell a remedy. The
 * whole reason to build this surface is to be the calm answer instead.
 */

export type ConditionKey =
    | 'gajakesari'
    | 'kuja-dosha'
    | 'kemadruma'
    | 'kala-sarpa'
    | 'sade-sati';

/**
 * One chart-level condition, decided but not judged.
 *
 * `factors` carries the placements the verdict rests on, so a reader can see WHY
 * it applies rather than being told that it does.
 */
export interface YogaFinding {
    key: ConditionKey;
    name: string;
    present: boolean;
    /** Chart facts only. Never an interpretation. */
    factors: string[];
    /** Sade Sati only: which of the three phases is running. */
    phase?: string;
}

export interface ConditionContent {
    key: ConditionKey;
    /** Devanagari, for readers who know the term by its own name. */
    sanskrit: string;
    /** Plain-language name, used as the page heading. */
    title: string;
    /** One line under the heading, true whether or not it applies. */
    summary: string;
    /** What the tradition actually says. */
    tradition: string;
    /** How it is decided, so the verdict is checkable rather than pronounced. */
    howItIsDecided: string;
    /** What tempers it — the part fear-based readings leave out. */
    moderatingFactors: string[];
    /** Read this if it applies to you. */
    whenPresent: string;
    /** Read this if it does not — which is the more common case. */
    whenAbsent: string;
    /** Why the good/bad framing fails. Shown to everyone. */
    whyNotAVerdict: string;
}

export const CONDITIONS: Record<ConditionKey, ConditionContent> = {
    'sade-sati': {
        key: 'sade-sati',
        sanskrit: 'साढ़े साती',
        title: 'Sade Sati',
        summary:
            'The roughly seven-and-a-half years while Saturn passes the sign before your Moon, your Moon itself, and the sign after.',
        tradition:
            'Saturn takes about two and a half years to cross a sign, so three signs take about seven and a half — which is what the name says: “seven and a half”. The tradition treats it as a period of weight and consolidation, when the things you have built loosely are tested for whether they hold. It is described as difficult in the classical texts, and it is also described as formative; readings that keep only the first half are the ones that sell something.',
        howItIsDecided:
            'Find the sign your Moon occupies at birth. Sade Sati runs while transiting Saturn is in the sign before it, in it, or in the sign after. Nothing else is required, which is why this is one of the few traditional periods that can be stated exactly rather than estimated.',
        moderatingFactors: [
            'The strength and dignity of Saturn in your own birth chart',
            'Whether Saturn owns favourable houses for your ascendant',
            'Which of the three phases is running — the middle is not the same as the edges',
            'What Jupiter is doing at the same time, which the tradition treats as the counterweight',
            'Your current dasha, which often says more about a given year than any transit',
        ],
        whenPresent:
            'A phase of this is running for you now. In practice people describe it as a period where effort stops producing quick results and starts producing durable ones — slower, heavier, and clarifying about what actually matters. It is worth knowing which of the three phases you are in, because they are not alike: the first tends to ask you to let go of things, the middle to restructure, the last to settle accounts.',
        whenAbsent:
            'Saturn is not currently transiting the three signs around your Moon, so this period is not running for you. If you have heard the term and were worried, that is the answer. Saturn reaches everyone eventually — roughly every thirty years — and knowing when it is not happening is as useful as knowing when it is.',
        whyNotAVerdict:
            'Sade Sati says which transit is running, not what will happen to you. Two people in the same phase of it, in the same month, are living different lives — because the dasha, the natal chart and everything non-astrological about their circumstances differ. Anyone who tells you what Sade Sati will do to you specifically is guessing, usually with something to sell.',
    },

    'kuja-dosha': {
        key: 'kuja-dosha',
        sanskrit: 'मंगल दोष',
        title: 'Mangal Dosha',
        summary:
            'Mars placed in certain houses from the ascendant — traditionally read as intensity in partnership.',
        tradition:
            'Also called Kuja Dosha or being “Manglik”. Mars in the 1st, 4th, 7th, 8th or 12th house is held to add heat and force to the areas of life the 7th house governs — partnership, agreement, the daily business of living alongside someone. Classically this was a matching consideration, not a description of a person.',
        howItIsDecided:
            'Count houses from your ascendant. If Mars falls in the 1st, 4th, 7th, 8th or 12th, the condition is present by this rule. Different traditions count from the Moon or from Venus as well, and disagree about the 2nd house, which is one reason two astrologers can give you two answers in good faith.',
        moderatingFactors: [
            'Mars in its own sign or exalted, which the tradition treats as cancelling much of it',
            'Both partners having it, which classical matching treats as neutralising',
            'Jupiter or Venus aspecting the placement',
            'Age — several texts limit the reading to early marriage',
            'The rest of the 7th house, which one planet does not determine on its own',
        ],
        whenPresent:
            'Mars sits in one of those houses in your chart. The useful reading is about temperature rather than doom: directness, impatience with drift, a low tolerance for unspoken problems. Those are traits, and traits are workable. The traditional cautions are about matching two charts, not about whether you can have a good relationship.',
        whenAbsent:
            'Mars is not in any of the houses this rule names, so the condition is not present in your chart. If someone has told you otherwise, they may be counting from the Moon or from Venus instead of the ascendant, which is a legitimate variant that gives a different answer.',
        whyNotAVerdict:
            'This is the single most misused term in Indian astrology. It has been used to break off matches and to frighten people — usually young women — about their prospects. One planet in one house cannot decide whether a marriage works. Treat it as one factor among many, and treat anyone who presents it as a verdict as unreliable.',
    },

    'kala-sarpa': {
        key: 'kala-sarpa',
        sanskrit: 'काल सर्प योग',
        title: 'Kala Sarpa Yoga',
        summary:
            'Every classical planet falling on one side of the Rahu–Ketu axis.',
        tradition:
            'Rahu and Ketu sit exactly opposite each other, cutting the chart in two. When all seven classical planets fall within one of those halves, the chart is described as “hemmed” by the nodes. The tradition reads it as a life with a strong single direction — concentrated rather than dispersed — and it is not among the classical yogas in the oldest texts, which is worth knowing given how much weight it is given now.',
        howItIsDecided:
            'Take the longitude of Rahu. If every one of the Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn lies within the 180° going one way from it, the condition is present. A single planet on the other side breaks it — which is why the answer can change with a birth time correction of a few minutes.',
        moderatingFactors: [
            'How close the outlying planet is, when it only just breaks or only just completes',
            'Birth time accuracy, which this condition is unusually sensitive to',
            'Whether the enclosing half contains the chart’s strong planets or its weak ones',
            'That it appears in a meaningful share of all charts, so it cannot be rare enough to explain an unusual life',
        ],
        whenPresent:
            'Your planets do all fall on one side of the nodal axis. Read it as concentration: energy pointed in fewer directions than average, which shows up as single-mindedness more often than as crisis. It says nothing about misfortune.',
        whenAbsent:
            'At least one planet falls on the other side of the axis, so the condition does not apply to your chart.',
        whyNotAVerdict:
            'This one attracts more fear-based marketing than any other, largely because it sounds dramatic and photographs well. It is a geometric fact about where the planets happen to sit relative to two calculated points. If you are ever told it requires an expensive remedy to fix, you are being sold something.',
    },

    gajakesari: {
        key: 'gajakesari',
        sanskrit: 'गजकेसरी योग',
        title: 'Gajakesari Yoga',
        summary: 'Jupiter in an angle from the Moon — traditionally a supportive combination.',
        tradition:
            '“Elephant and lion”: Jupiter standing in the 1st, 4th, 7th or 10th sign from the Moon. It is read as steadiness of mind supported by judgement, and is one of the more frequently cited favourable combinations. It is also fairly common, which is the part usually left out.',
        howItIsDecided:
            'Count signs from the Moon to Jupiter. A distance of 1, 4, 7 or 10 — a kendra — satisfies the rule.',
        moderatingFactors: [
            'Jupiter’s own dignity, since a weak Jupiter forms the pattern without much strength behind it',
            'Whether Jupiter is combust or closely afflicted',
            'How common the combination is — roughly one chart in three',
        ],
        whenPresent:
            'Jupiter does sit in an angle from your Moon. Read it as a supportive baseline rather than a guarantee: it describes a tendency for perspective to arrive alongside feeling, which is useful and is not the same as good fortune.',
        whenAbsent:
            'Jupiter is not in an angle from your Moon. This is an ordinary result and not a deficiency — most favourable combinations are absent from most charts, and a chart is read as a whole.',
        whyNotAVerdict:
            'A favourable yoga is as poorly used as a frightening one when it is treated as a promise. It is one pattern among many, and it is common enough that it cannot by itself explain anyone’s life.',
    },

    kemadruma: {
        key: 'kemadruma',
        sanskrit: 'केमद्रुम योग',
        title: 'Kemadruma Yoga',
        summary: 'No classical planet in the sign either side of the Moon.',
        tradition:
            'The Moon standing without company on either side is described as unsupported — the mind working without the immediate steadying influence of another planet. Classical sources also list several conditions that cancel it, and those are quoted far less often than the yoga itself.',
        howItIsDecided:
            'Look at the sign before and the sign after the Moon’s. If neither contains Mars, Mercury, Jupiter, Venus or Saturn, the condition is present. The Sun and the nodes are excluded from this count, which is the classical rule.',
        moderatingFactors: [
            'A planet in an angle from the Moon, which several texts treat as cancelling it outright',
            'Jupiter aspecting the Moon',
            'The Moon being strong, full, or well placed by house',
            'The Sun’s position, since the Sun is excluded from the count but not from the chart',
        ],
        whenPresent:
            'Neither neighbouring sign holds a classical planet. The honest reading is self-reliance: a mind that runs on its own supply, which people experience as independence and, in harder stretches, as isolation. Both descriptions are of the same thing.',
        whenAbsent:
            'There is a planet beside your Moon, so the condition does not apply.',
        whyNotAVerdict:
            'The classical cancellations matter as much as the rule, and a reading that states the yoga without checking them is incomplete. This is a factor to weigh, not a sentence about someone’s emotional life.',
    },
};

/** In the order the page shows them: what is running now, then the natal ones. */
export const CONDITION_ORDER: ConditionKey[] = [
    'sade-sati',
    'kuja-dosha',
    'kala-sarpa',
    'gajakesari',
    'kemadruma',
];
