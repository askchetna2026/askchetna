import { ZODIAC_SIGNS } from './zodiac';

/**
 * The lunar calendar ahead, computed rather than tabulated.
 *
 * Every entry here is derived from the Sun and Moon: a tithi is the elongation
 * between them divided into thirty, and a sankranti is the Sun crossing a sign
 * boundary. So the dates are calculated for the seeker's own location and stay
 * correct in any year, rather than coming from a table that silently expires.
 *
 * WHAT IS DELIBERATELY NOT HERE: named festivals — Diwali, Holi, Navaratri.
 * Those are fixed by (lunar month, paksha, tithi), and the lunar month requires
 * a masa rule that differs between the amanta and purnimanta reckonings, shifts
 * the month name by one across large parts of India, and needs an adhika-masa
 * correction. Getting that subtly wrong would put a festival on the wrong day
 * for half the audience while looking authoritative, and the catalogue is
 * explicit that calendar rules must be domain validated before they ship.
 *
 * The structure below takes named festivals without changing shape, so adding
 * them once the masa rule is reviewed is a data change rather than a rewrite.
 * Until then this says only what it can actually work out — which is most of
 * what a practising person watches for anyway.
 */

export type ObservanceKind = 'purnima' | 'amavasya' | 'ekadashi' | 'sankranti';

export interface Observance {
    kind: ObservanceKind;
    /** ISO date, local to the coordinates asked about. */
    date: string;
    name: string;
    /** One line, factual — what is true of the sky on that day. */
    detail: string;
}

const KIND_NAME: Record<ObservanceKind, string> = {
    purnima: 'Purnima',
    amavasya: 'Amavasya',
    ekadashi: 'Ekadashi',
    sankranti: 'Sankranti',
};

export const KIND_NOTE: Record<ObservanceKind, string> = {
    purnima: 'Full moon — the Moon exactly opposite the Sun.',
    amavasya: 'New moon — the Moon and Sun at the same longitude.',
    ekadashi:
        'The eleventh tithi of each half-month. Observed as a fast in most traditions; it falls twice a lunar month.',
    sankranti: 'The Sun crossing from one sign into the next. Twelve a year.',
};

/**
 * Which of the thirty tithis is running, 1-30.
 *
 * 1-15 are the waxing half ending at Purnima; 16-30 the waning half ending at
 * Amavasya. Purely the elongation, so no ephemeris beyond two longitudes.
 */
export function tithiNumber(sunLongitude: number, moonLongitude: number): number {
    const elongation = (moonLongitude - sunLongitude + 360) % 360;
    return Math.floor(elongation / 12) + 1;
}

/** Zero-based zodiac index of a longitude. */
const signIndex = (longitude: number) => Math.floor(longitude / 30);

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Walk forward a day at a time, recording where the tithi or the Sun's sign
 * changes into something worth naming.
 *
 * Daily sampling, not bisection: a tithi lasts under a day, so anything coarser
 * would step straight over one. That is 30-ish ephemeris lookups for a month,
 * which is why the caller memoises them by day and shares them with the
 * forecast.
 */
export async function upcomingObservances(
    fromMs: number,
    days: number,
    positionsAt: (ms: number) => Promise<Record<string, number>>,
    offsetMs = 0
): Promise<Observance[]> {
    const DAY = 86_400_000;
    const out: Observance[] = [];

    let previousSunSign: number | null = null;

    for (let i = 0; i <= days; i++) {
        const at = fromMs + i * DAY;
        const pos = await positionsAt(at);
        const sun = pos['Sun'];
        const moon = pos['Moon'];
        if (typeof sun !== 'number' || typeof moon !== 'number') continue;

        // The label belongs to the LOCAL day at the coordinates, not the UTC
        // one — the same correction the muhurat windows need.
        const date = isoDay(at + offsetMs);
        const tithi = tithiNumber(sun, moon);

        if (tithi === 15) {
            out.push({
                kind: 'purnima',
                date,
                name: KIND_NAME.purnima,
                detail: `The Moon is in ${ZODIAC_SIGNS[signIndex(moon)]}, opposite the Sun in ${ZODIAC_SIGNS[signIndex(sun)]}.`,
            });
        } else if (tithi === 30) {
            out.push({
                kind: 'amavasya',
                date,
                name: KIND_NAME.amavasya,
                detail: `The Moon and the Sun are both in ${ZODIAC_SIGNS[signIndex(sun)]}.`,
            });
        } else if (tithi === 11 || tithi === 26) {
            out.push({
                kind: 'ekadashi',
                date,
                name: KIND_NAME.ekadashi,
                detail: tithi === 11 ? 'Of the waxing half.' : 'Of the waning half.',
            });
        }

        const sunSign = signIndex(sun);
        if (previousSunSign !== null && sunSign !== previousSunSign) {
            out.push({
                kind: 'sankranti',
                date,
                name: `${ZODIAC_SIGNS[sunSign]} Sankranti`,
                detail: `The Sun leaves ${ZODIAC_SIGNS[previousSunSign]} and enters ${ZODIAC_SIGNS[sunSign]}.`,
            });
        }
        previousSunSign = sunSign;
    }

    // One entry per (kind, date). Sampling once a day can otherwise report the
    // same tithi twice when it straddles two samples.
    const seen = new Set<string>();
    return out.filter((o) => {
        const key = `${o.kind}:${o.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
