/**
 * Zodiac primitives and chart shapes — the half of the astrology library that
 * is pure arithmetic over a longitude.
 *
 * Split out of calculator.ts for one reason, and it is a big one: calculator.ts
 * does `require('./swisseph-binaries')`, a 16.8 MB module of base64-encoded
 * ephemeris. That require sits inside a function, but a literal specifier is
 * statically analysable, so webpack pulls it into every bundle that reaches
 * calculator.ts — including CLIENT bundles. Three components imported nothing
 * from it but `getZodiacSign`, `getNakshatra` and a type, and that was enough
 * to make /chart's browser chunk 16.6 MB (6.3 MB over the wire) against 12–41 KB
 * for every other page. The browser never runs a line of it; the ephemeris is
 * server-only.
 *
 * So: anything a client component needs lives HERE, and this file must never
 * import calculator.ts or anything that reaches swisseph. calculator.ts
 * re-exports all of it, so server-side callers are unaffected.
 */

export interface PlanetPosition {
    name: string;
    longitude: number;
    latitude: number;
    distance: number;
    speed: number;
    isRetrograde: boolean;
    house?: number;
    navamsaSign?: string; // D9 Sign
    dignity?: string;     // Exalted, Debilitated, Own Sign, Great Friend, etc.
}

export interface ChartData {
    planets: Record<string, PlanetPosition>;
    houses: number[];
    ascendant: number;
    mc: number;
    navamsaAscendant?: string; // D9 Sign
    vargas?: Record<string, {
        planets: Record<string, PlanetPosition>;
        ascendant: number;
        houses: number[];
    }>;
    dashas?: Array<{
        lord: string;
        start: string;
        end: string;
        isCurrent: boolean;
        antardashas: Array<{
            lord: string;
            start: string;
            end: string;
            isCurrent: boolean;
            pratyantarDashas?: Array<{
                lord: string;
                start: string;
                end: string;
                isCurrent: boolean;
                sookshmaDashas?: Array<{
                    lord: string;
                    start: string;
                    end: string;
                    isCurrent: boolean;
                    pranaDashas?: Array<{
                        lord: string;
                        start: string;
                        end: string;
                        isCurrent: boolean;
                    }>;
                }>;
            }>;
        }>;
    }>;
}

export const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export function getZodiacSign(longitude: number): string {
    return ZODIAC_SIGNS[Math.floor(longitude / 30)];
}

export const NAKSHATRAS = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
    'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export const NAKSHATRA_LORDS = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

export const DASHA_YEARS: Record<string, number> = {
    'Ketu': 7,
    'Venus': 20,
    'Sun': 6,
    'Moon': 10,
    'Mars': 7,
    'Rahu': 18,
    'Jupiter': 16,
    'Saturn': 19,
    'Mercury': 17
};

export function getNakshatra(longitude: number): { name: string, index: number, lord: string, degreeInNakshatra: number } {
    const nakshatraSize = 360 / 27;
    const index = Math.floor(longitude / nakshatraSize);
    const lordIndex = index % 9;
    const degreeInNakshatra = longitude % nakshatraSize;
    return {
        name: NAKSHATRAS[index],
        index,
        lord: NAKSHATRA_LORDS[lordIndex],
        degreeInNakshatra
    };
}

/**
 * How deep a dasha tree to build when the result is going to be *stored*.
 *
 * 1 = mahadasha -> antardasha. Every consumer that reads dashas out of
 * Profile.chartData (ShareChartCard, /api/journal/analyze) stops at antardasha;
 * each level below multiplies the JSON by 9 and is written once, read never.
 */
export const DASHA_DEPTH_STORED = 1;

/** Mahadasha -> antardasha -> pratyantar -> sookshma, for live responses. */
export const DASHA_DEPTH_FULL = 3;

/**
 * @param maxLevel How many levels below mahadasha to build. Defaults to the
 *   full tree, so live callers keep the depth the timing page renders; storage
 *   paths pass DASHA_DEPTH_STORED.
 */
export function calculateVimsottariDashas(moonLong: number, birthDate: Date, maxLevel: number = DASHA_DEPTH_FULL) {
    const nak = getNakshatra(moonLong);
    const nakSize = 360 / 27;
    const lordYears = DASHA_YEARS[nak.lord];

    // Remaining years in first dasha: (Years * (NakSize - degreeInNak)) / NakSize
    const elapsedRatio = nak.degreeInNakshatra / nakSize;
    const remainingRatio = 1 - elapsedRatio;
    const yearsRemaining = lordYears * remainingRatio;

    const dashas: Array<{
        lord: string;
        start: Date;
        end: Date;
        isCurrent: boolean;
        antardashas: Array<{ lord: string; start: Date; end: Date; isCurrent: boolean }>
    }> = [];
    let currentDate = new Date(birthDate);

    // Find index of starting lord in sequence
    let lordIdx = NAKSHATRA_LORDS.indexOf(nak.lord);

    const calculateSubPeriods = (mLord: string, mStart: Date, mEnd: Date, level: number = 1): any[] => {
        const subPeriods = [];
        let subStart = new Date(mStart);
        let subLordIdx = NAKSHATRA_LORDS.indexOf(mLord);

        for (let j = 0; j < 9; j++) {
            const aLord = NAKSHATRA_LORDS[subLordIdx];
            const aYears = DASHA_YEARS[aLord];

            // Formula: Parent Duration * (Years / 120)
            const parentDurationDays = (mEnd.getTime() - mStart.getTime()) / (1000 * 60 * 60 * 24);
            const totalDays = (parentDurationDays * aYears) / 120;

            const subEnd = new Date(subStart.getTime() + totalDays * 24 * 60 * 60 * 1000);
            const finalSubEnd = j === 8 ? new Date(mEnd) : subEnd;

            const period: any = {
                lord: aLord,
                start: new Date(subStart),
                end: new Date(finalSubEnd),
                isCurrent: false
            };

            // Recursive call for next levels up to maxLevel (closed over from
            // the caller): 1 stops at antardasha, 3 reaches sookshma.
            if (level < maxLevel) {
                const subKey = level === 1 ? 'pratyantarDashas' :
                    level === 2 ? 'sookshmaDashas' :
                        'pranaDashas';
                period[subKey] = calculateSubPeriods(aLord, period.start, period.end, level + 1);
            }

            subPeriods.push(period);
            subStart = new Date(finalSubEnd);
            subLordIdx = (subLordIdx + 1) % 9;
        }
        return subPeriods;
    };

    // Calculate first partial dasha
    const firstEndDate = new Date(currentDate);
    firstEndDate.setFullYear(firstEndDate.getFullYear() + Math.floor(yearsRemaining));
    const remainingDays = (yearsRemaining % 1) * 365.25;
    firstEndDate.setDate(firstEndDate.getDate() + Math.round(remainingDays));

    const firstMahadasha = {
        lord: nak.lord,
        start: new Date(currentDate),
        end: new Date(firstEndDate),
        isCurrent: false,
        antardashas: [] as any[]
    };
    firstMahadasha.antardashas = calculateSubPeriods(nak.lord, firstMahadasha.start, firstMahadasha.end);
    dashas.push(firstMahadasha);

    currentDate = new Date(firstEndDate);

    // Calculate next full cycle (9 lords)
    for (let i = 1; i < 9; i++) {
        lordIdx = (lordIdx + 1) % 9;
        const nextLord = NAKSHATRA_LORDS[lordIdx];
        const years = DASHA_YEARS[nextLord];

        const endDate = new Date(currentDate);
        endDate.setFullYear(endDate.getFullYear() + years);

        const mahadasha = {
            lord: nextLord,
            start: new Date(currentDate),
            end: new Date(endDate),
            isCurrent: false,
            antardashas: [] as any[]
        };
        mahadasha.antardashas = calculateSubPeriods(nextLord, mahadasha.start, mahadasha.end);
        dashas.push(mahadasha);

        currentDate = new Date(endDate);
    }

    const now = new Date();
    const mapPeriod = (p: any): any => ({
        ...p,
        start: p.start.toISOString(),
        end: p.end.toISOString(),
        isCurrent: now >= p.start && now < p.end,
        antardashas: p.antardashas?.map(mapLevel),
        pratyantarDashas: p.pratyantarDashas?.map(mapLevel),
        sookshmaDashas: p.sookshmaDashas?.map(mapLevel),
        pranaDashas: p.pranaDashas?.map(mapLevel)
    });

    function mapLevel(level: any): any {
        return {
            ...level,
            start: level.start.toISOString(),
            end: level.end.toISOString(),
            isCurrent: now >= level.start && now < level.end,
            pratyantarDashas: level.pratyantarDashas?.map(mapLevel),
            sookshmaDashas: level.sookshmaDashas?.map(mapLevel),
            pranaDashas: level.pranaDashas?.map(mapLevel)
        };
    }

    return dashas.map(mapPeriod);
}
