import type { ChartData } from './zodiac';
import { getZodiacSign, ZODIAC_SIGNS } from './zodiac';

/**
 * Tomorrow, this week, this month, this year — from the seeker's own chart.
 *
 * Deliberately NOT another model call. The catalogue asks for horizons that are
 * "derived from the user's available chart context" rather than generic zodiac
 * forecasts, and the honest version of that is arithmetic: when the running
 * sub-period ends, which slow planet changes sign inside the window, which
 * house it moves into from this Moon. Those are facts with dates on them. A
 * language model asked for "your month ahead" produces something that reads
 * better and knows less.
 *
 * It is also four times cheaper. Today's note already costs one call per seeker
 * per day; adding three more horizons the same way would have quadrupled the
 * largest recurring bill in the product to say less.
 *
 * What this returns is a list of dated events and the period they sit inside.
 * Interpretation — what a Saturn ingress into the 7th might ask of someone — is
 * a separate layer, and the events carry enough structure for it to be written
 * later without guessing.
 */

export type Horizon = 'tomorrow' | 'week' | 'month' | 'year';

export const HORIZON_DAYS: Record<Horizon, number> = {
    tomorrow: 2,
    week: 7,
    month: 30,
    year: 365,
};

export const HORIZONS: Horizon[] = ['tomorrow', 'week', 'month', 'year'];

export interface ForecastEvent {
    /** ISO date the event falls on. */
    date: string;
    kind: 'dasha' | 'antardasha' | 'ingress';
    /** Short, factual. "Mercury sub-period ends", "Saturn enters Aries". */
    title: string;
    /** The chart fact behind it — house from the Moon, period boundary. */
    detail: string;
}

export interface ForecastResult {
    horizon: Horizon;
    from: string;
    to: string;
    /** The mahadasha and antardasha covering the whole window, where stable. */
    period: { mahadasha: string | null; antardasha: string | null };
    events: ForecastEvent[];
}

/** Planets slow enough that a sign change inside a window is worth naming. */
export const SLOW_PLANETS = ['Saturn', 'Jupiter', 'Rahu', 'Ketu'] as const;

/**
 * How long each one spends in a sign, in words.
 *
 * Per planet rather than one phrase for all four: they differ by more than
 * double, and a single figure would be wrong for three of them.
 */
const DWELL: Record<(typeof SLOW_PLANETS)[number], string> = {
    Saturn: 'for about two and a half years',
    Jupiter: 'for about a year',
    Rahu: 'for about eighteen months',
    Ketu: 'for about eighteen months',
};

interface DashaNode {
    lord: string;
    start: string;
    end: string;
    antardashas?: DashaNode[];
}

function covering(periods: DashaNode[] | undefined, at: number): DashaNode | null {
    if (!Array.isArray(periods)) return null;
    for (const p of periods) {
        const s = Date.parse(p.start);
        const e = Date.parse(p.end);
        if (Number.isFinite(s) && Number.isFinite(e) && at >= s && at <= e) return p;
    }
    return null;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Dasha and antardasha boundaries falling inside the window.
 *
 * Free and exact: the whole tree is already stored on the profile, so this is a
 * scan rather than a calculation. It is also the single most useful thing any
 * of these horizons can say, because a period boundary is a real date rather
 * than a mood.
 */
function dashaEvents(chart: ChartData, fromMs: number, toMs: number): ForecastEvent[] {
    const events: ForecastEvent[] = [];
    const tree = chart.dashas as DashaNode[] | undefined;
    if (!Array.isArray(tree)) return events;

    for (const maha of tree) {
        const end = Date.parse(maha.end);
        if (end >= fromMs && end <= toMs) {
            events.push({
                date: isoDay(end),
                kind: 'dasha',
                title: `Your ${maha.lord} chapter ends`,
                detail: 'The longest cycle in your chart turns over — a new chapter begins the same day.',
            });
        }

        for (const antar of maha.antardashas ?? []) {
            const aEnd = Date.parse(antar.end);
            if (aEnd >= fromMs && aEnd <= toMs) {
                events.push({
                    date: isoDay(aEnd),
                    kind: 'antardasha',
                    title: `Your ${antar.lord} stretch ends`,
                    detail: `A shorter stretch inside your longer ${maha.lord} chapter.`,
                });
            }
        }
    }

    return events;
}

/**
 * Which house a transiting sign falls in, counted from the natal Moon.
 *
 * From the Moon rather than the ascendant, matching how transits are read
 * traditionally — and how Sade Sati is already calculated elsewhere here.
 */
function houseFromMoon(chart: ChartData, signIndex: number): number | null {
    const moon = chart.planets?.Moon?.longitude;
    if (typeof moon !== 'number') return null;
    return ((signIndex - Math.floor(moon / 30) + 12) % 12) + 1;
}

const DAY_MS = 86_400_000;

/**
 * How far apart to sample when hunting for sign changes.
 *
 * Weekly. It used to compare only the two ENDS of the window, which produced
 * horizons that contradicted each other: "tomorrow" reported Saturn entering
 * Aries on the 18th while "this week" — a window containing the 18th — reported
 * nothing at all, because Saturn sat on the cusp and was back in Pisces by the
 * end of the week. A planet near a station crosses and re-crosses, so the ends
 * of a window say nothing about what happened between them.
 *
 * Seven days is safe for these four: the fastest of them, Jupiter, covers about
 * half a degree a week, so it cannot enter and leave a sign between samples.
 * Days are memoised by the caller, so overlapping horizons re-use them.
 */
const SAMPLE_STEP_MS = 7 * DAY_MS;

/**
 * Sign changes among the slow planets, with the day each one lands on.
 *
 * `positionsAt` is injected rather than imported so this module stays free of
 * the ephemeris and can be read by a client component. The caller — which is
 * server-side and already has swisseph loaded — supplies it.
 *
 * Walks the window in steps, then bisects each step where the sign differs, so
 * the date is exact to the day without paying for a lookup per day.
 */
export async function ingressEvents(
    chart: ChartData,
    fromMs: number,
    toMs: number,
    positionsAt: (ms: number) => Promise<Record<string, number>>
): Promise<ForecastEvent[]> {
    const events: ForecastEvent[] = [];

    // Sample points across the window, always including both ends.
    const samples: number[] = [];
    for (let t = fromMs; t < toMs; t += Math.min(SAMPLE_STEP_MS, Math.max(DAY_MS, toMs - fromMs))) {
        samples.push(t);
    }
    samples.push(toMs);

    const positions = new Map<number, Record<string, number>>();
    for (const t of samples) positions.set(t, await positionsAt(t));

    for (const planet of SLOW_PLANETS) {
        for (let i = 0; i < samples.length - 1; i++) {
            const a = positions.get(samples[i])?.[planet];
            const b = positions.get(samples[i + 1])?.[planet];
            if (typeof a !== 'number' || typeof b !== 'number') continue;

            const signA = Math.floor(a / 30);
            const signB = Math.floor(b / 30);
            if (signA === signB) continue;

            // Bisect this step to the day the sign first differs.
            let lo = samples[i];
            let hi = samples[i + 1];
            while (hi - lo > DAY_MS) {
                const mid = lo + Math.floor((hi - lo) / 2);
                const midSign = Math.floor((await positionsAt(mid))[planet] / 30);
                if (midSign === signA) lo = mid;
                else hi = mid;
            }

            const house = houseFromMoon(chart, signB);
            events.push({
                date: isoDay(hi),
                kind: 'ingress',
                title: `${planet} enters ${ZODIAC_SIGNS[signB]}`,
                // Said as a fact about the sky and a fact about their chart,
                // without the counting-houses vocabulary. "The 7th sign from
                // your Moon" means nothing to someone who has not been taught
                // to count houses, and most readers have not.
                //
                // The dwell time is per planet. It briefly said "roughly two
                // and a half years" for all four while this was being made
                // readable — which is Saturn's pace and nobody else's: Jupiter
                // clears a sign in about a year.
                detail: house
                    ? `Leaving ${ZODIAC_SIGNS[signA]}, where it has been ${DWELL[planet]}. This is the part of your chart ${house} signs on from where your Moon sits.`
                    : `Leaving ${ZODIAC_SIGNS[signA]}.`,
            });
        }
    }

    return events;
}

/**
 * Assemble one horizon.
 *
 * Events are sorted by date, because a forecast is read as a sequence and
 * grouping by planet would make the reader do the sorting.
 */
export async function buildForecast(
    chart: ChartData,
    horizon: Horizon,
    positionsAt: (ms: number) => Promise<Record<string, number>>,
    now = Date.now()
): Promise<ForecastResult> {
    const fromMs = horizon === 'tomorrow' ? now + 86_400_000 : now;
    const toMs = now + HORIZON_DAYS[horizon] * 86_400_000;

    const maha = covering(chart.dashas as DashaNode[] | undefined, fromMs);
    const antar = covering(maha?.antardashas, fromMs);

    const events = [
        ...dashaEvents(chart, fromMs, toMs),
        ...(await ingressEvents(chart, fromMs, toMs, positionsAt)),
    ].sort((x, y) => x.date.localeCompare(y.date));

    return {
        horizon,
        from: isoDay(fromMs),
        to: isoDay(toMs),
        period: { mahadasha: maha?.lord ?? null, antardasha: antar?.lord ?? null },
        events,
    };
}

/** Where the Moon is, for the short horizons that turn on it. */
export function moonSignAt(longitude: number | undefined): string | null {
    return typeof longitude === 'number' ? getZodiacSign(longitude) : null;
}
