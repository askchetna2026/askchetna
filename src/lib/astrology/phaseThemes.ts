/**
 * Plain-language reading of a Mahadasha lord — what the phase is asking of you.
 *
 * Lifted out of TimingPageContent when the signed-in home began showing the
 * same current-chapter summary. Two copies of this text would drift, and it is
 * the wording that carries the product's "patterns, not predictions" framing —
 * every entry describes what the season asks, never what it will do to you.
 */
export const PHASE_THEMES: Record<string, { theme: string; asking: string }> = {
    'Jupiter': { theme: 'A season of growth, learning, and expansion', asking: 'This is an opening phase. Life is asking you to say yes to opportunities, widen your horizons, and trust that you have room to grow — through new knowledge, mentors, or beliefs.' },
    'Saturn': { theme: 'A season of discipline, structure, and maturing', asking: 'This is a building phase, not a resting one. Life is asking you to slow down, take responsibility, and do the patient work — what you construct now is meant to last.' },
    'Mercury': { theme: 'A season of communication, learning, and connection', asking: 'This is a thinking and connecting phase. Life is asking you to learn, exchange ideas, and put your intelligence to work through conversation, study, or commerce.' },
    'Venus': { theme: 'A season of relationships, creativity, and pleasure', asking: 'This is a softening phase. Life is asking you to nurture connection, create beauty, and allow yourself comfort and enjoyment — relationships and creativity flow more easily now.' },
    'Sun': { theme: 'A season of identity, clarity, and leadership', asking: 'This is a stepping-forward phase. Life is asking you to claim your authority, express who you truly are, and lead from a place of confidence rather than hiding.' },
    'Moon': { theme: 'A season of emotion, care, and inner life', asking: 'This is a feeling phase. Life is asking you to tend to your emotional needs, nurture and be nurtured, and honour your inner world and your home.' },
    'Mars': { theme: 'A season of action, effort, and identity', asking: 'This is a doing phase, not a resting phase. Life is asking you to take initiative, fight for what matters, and put your energy into focused, courageous effort.' },
    'Rahu': { theme: 'A season of ambition, hunger, and the unfamiliar', asking: 'This is a reaching phase. Life is asking you to chase the unconventional and the unknown — expect intensity and rapid change as you stretch beyond your comfort zone.' },
    'Ketu': { theme: 'A season of release, introspection, and letting go', asking: 'This is a releasing phase. Life is asking you to detach from what no longer serves you, turn inward, and find meaning beyond the material.' },
};
