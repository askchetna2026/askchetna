/**
 * The plain-English glossary, and the per-sign examples built on it.
 *
 * A plain module rather than part of Term.tsx, because /glossary is a SERVER
 * component and Term.tsx is `'use client'`. Every export of a client module is
 * a client REFERENCE on the server, so `Object.values(GLOSSARY)` there returned
 * nothing and the glossary page rendered its heading, its divider and its call
 * to action above an empty grid — no terms at all, silently, with no error.
 */

// Predicates completing "Your <sign> Ascendant …" / "Your <sign> Moon …".
//
// These exist because the generic `example` below is written around one fixed
// sign, and the tooltip is read while the reader's OWN sign is on screen beside
// it — a Gemini Ascendant was being told what an Aries Ascendant does. A reader
// who opens a glossary because they do not understand a term is the last person
// who should have to work out that the example is not about them.
//
// `example` stays as the fallback for /glossary, where no chart is on screen.
const ASCENDANT_BY_SIGN: Record<string, string> = {
    Aries: 'walks into meetings and takes charge, even when it feels uncertain from the inside.',
    Taurus: 'is steady and unhurried — people read you as calm, and as hard to rush.',
    Gemini: 'is quick and curious, and will talk to fill a silence; people read you as bright and a little restless.',
    Cancer: 'reads the mood of a room before saying much — careful first, warm once you have settled.',
    Leo: 'arrives noticeably; people register that you have walked in, and you feel the attention.',
    Virgo: 'notices the detail nobody else mentioned; it can read as precise, or as reserved.',
    Libra: 'meets people halfway by default, smoothing friction before it has properly formed.',
    Scorpio: 'gives very little away early; people find you intense and difficult to read.',
    Sagittarius: 'is open and direct — the honest sentence tends to arrive before the diplomatic one.',
    Capricorn: 'comes across measured and serious; people often assume you are older or more senior than you are.',
    Aquarius: 'is friendly but slightly apart — you observe a group for a while before joining it.',
    Pisces: 'is soft-edged and adaptive; you take on the mood of whoever you are with.',
};

const MOON_BY_SIGN: Record<string, string> = {
    Aries: 'reacts fast when hurt — heat first, and then it passes almost as quickly.',
    Taurus: 'wants routine and physical comfort, and retreats into familiar things when unsettled.',
    Gemini: 'needs to talk it through; a feeling does not settle until it has been named out loud.',
    Cancer: 'goes very quiet when hurt, and needs time and safety before opening up again.',
    Leo: 'needs to feel seen — being overlooked stings considerably more than being disagreed with.',
    Virgo: 'tidies and fixes when anxious; comfort comes from having something back under control.',
    Libra: 'needs the air cleared — unresolved tension sits heavier than the disagreement itself did.',
    Scorpio: 'feels deeply and privately; trust is slow to give, and slower to rebuild once broken.',
    Sagittarius: 'needs space and movement, and feels trapped by too much closeness at once.',
    Capricorn: 'handles it alone first; asking for help tends to feel like a last resort.',
    Aquarius: 'steps back to think rather than feel, processing at a distance before coming back.',
    Pisces: 'absorbs whatever is in the room, and needs solitude to work out which feelings are yours.',
};

// Plain-English glossary used by the inline tooltip and the /glossary page (5.1, 8.1)
export const GLOSSARY: Record<
    string,
    { label: string; plain: string; example: string; bySign?: Record<string, string> }
> = {
    ascendant: {
        label: 'Ascendant (Lagna)',
        plain: 'How the world sees you at first glance — your social energy and default behaviour in a room.',
        example: 'An Aries Ascendant walks into meetings and takes charge, even if internally uncertain.',
        bySign: ASCENDANT_BY_SIGN,
    },
    moonsign: {
        label: 'Moon Sign (Rashi)',
        plain: 'Your emotional core — how you feel, what you need to feel safe, and how you react when hurt.',
        example: 'A Cancer Moon goes very quiet when hurt; it needs time and safety before opening up again.',
        bySign: MOON_BY_SIGN,
    },
    dasha: {
        label: 'Dasha',
        plain: 'The current life chapter you are in — each planet governs a multi-year period with its own theme.',
        example: 'Jupiter Dasha often brings growth or expansion — a new city, a new role, a shift in beliefs.',
    },
    mahadasha: {
        label: 'Mahadasha',
        plain: 'The major planetary period, lasting roughly 6–20 years.',
        example: 'Saturn Mahadasha asks for discipline, patience, and maturity — a slow-building chapter.',
    },
    antardasha: {
        label: 'Antardasha',
        plain: 'A sub-period within the major period — lasting months to a few years — adding a secondary theme.',
        example: 'Venus Antardasha within a Saturn Mahadasha can soften the heaviness with creative or relational openings.',
    },
    rahu: {
        label: 'Rahu',
        plain: 'The point of obsession, ambition, and the unfamiliar — what we chase but are not naturally comfortable with.',
        example: 'Strong Rahu in the career house often shows someone ambitious in unconventional ways.',
    },
    ketu: {
        label: 'Ketu',
        plain: 'The point of detachment, past tendencies, and inner wisdom — what comes naturally but must be released.',
        example: 'Ketu in the relationship house can show someone who emotionally withdraws without knowing why.',
    },
    transit: {
        label: 'Transit',
        plain: 'The current movement of planets through your chart — causing ripples in specific life areas.',
        example: 'When Saturn transits your 7th house, close relationships either deepen significantly or end.',
    },
    synastry: {
        label: 'Synastry',
        plain: 'How two people’s charts interact — what the relationship dynamic naturally produces.',
        example: 'Two people with conflicting Mars placements may find small disagreements escalate fast.',
    },
    nakshatra: {
        label: 'Nakshatra',
        plain: 'The specific lunar constellation your Moon or planet falls in — adds nuance beyond the basic sign.',
        example: 'Two people can both have a Scorpio Moon yet behave differently based on their Nakshatra.',
    },
    navamsa: {
        label: 'Navamsa (D9)',
        plain: 'A divisional chart that reveals the inner strength of your planets and your closest partnerships.',
        example: 'A strong Navamsa can mean someone who starts life with struggle but finishes with depth and stability.',
    },
    house: {
        label: 'House',
        plain: 'One of twelve life areas in your chart — self, money, communication, home, and so on.',
        example: 'Planets in the 10th house tend to shape your career and public reputation.',
    },
    // Added for /timing, which cannot ban its own vocabulary the way the daily
    // note does — dashas and nakshatras ARE its subject. The rule there is
    // different: keep the term, and gloss it the first time it appears.
    pada: {
        label: 'Pada',
        plain: 'A quarter of a nakshatra. Each one is divided into four, and which quarter a planet falls in shades how it expresses.',
        example: 'Two people can share a nakshatra and still differ noticeably if their planets sit in different padas.',
    },
    dignity: {
        label: 'Dignity (exalted / debilitated)',
        plain: 'How comfortable a planet is in the sign it occupies — exalted is its easiest placement, debilitated its most awkward.',
        example: 'A debilitated planet is not a bad one. It is a planet that has to work harder to express itself cleanly, and often does so later in life.',
    },
    sadesati: {
        label: 'Sade Sati',
        plain: 'The roughly seven and a half years while Saturn passes over and around your Moon sign — a long stretch of consolidation.',
        example: 'Sade Sati tends to slow things down and ask for maturity, rather than deliver one dramatic event.',
    },
};
