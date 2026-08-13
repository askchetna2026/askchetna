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
