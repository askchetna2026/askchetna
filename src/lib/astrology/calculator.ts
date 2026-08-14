import SwissEph from 'swisseph-wasm';
import {
    getZodiacSign,
    getNakshatra,
    ZODIAC_SIGNS,
    NAKSHATRAS,
    NAKSHATRA_LORDS,
    DASHA_YEARS,
    calculateVimsottariDashas,
    DASHA_DEPTH_STORED,
    DASHA_DEPTH_FULL,
    type ChartData,
    type PlanetPosition,
} from './zodiac';

/**
 * Re-exported so the eleven server-side callers that already import these from
 * here keep working. Client components must import from './zodiac' directly —
 * reaching them through this module drags in the 16.8 MB ephemeris. See the
 * header of zodiac.ts.
 */
export {
    getZodiacSign,
    getNakshatra,
    ZODIAC_SIGNS,
    NAKSHATRAS,
    NAKSHATRA_LORDS,
    DASHA_YEARS,
    calculateVimsottariDashas,
    DASHA_DEPTH_STORED,
    DASHA_DEPTH_FULL,
};
export type { ChartData, PlanetPosition };

// Dev-only diagnostics for the (finicky) WASM loader — silent in production.
const seLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args);
};

// Queue for serializing WASM calls
let calculationQueue: Promise<any> = Promise.resolve();

function serializeCalculation<T>(fn: () => Promise<T>): Promise<T> {
    const result = calculationQueue.then(() => fn().catch(error => {
        console.error("Calculation error in queue:", error);
        throw error;
    }));
    // Append catch to queue to prevent blocking subsequent calls on failure
    calculationQueue = result.catch(() => { });
    return result;
}

// Singleton instance to avoid re-initializing WASM
let sweInstance: SwissEph | null = null;
let swePromise: Promise<SwissEph> | null = null;

async function getSwe() {
    if (sweInstance) return sweInstance;

    if (!swePromise) {
        swePromise = (async () => {
            // Base64 decoding helper
            const decodeBase64 = (str: string): ArrayBuffer => {
                if (typeof Buffer !== 'undefined') {
                    return Buffer.from(str, 'base64').buffer;
                } else {
                    const binaryString = atob(str);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return bytes.buffer;
                }
            };

            // Load binaries from bundled Base64 strings (Nuclear Option)
            // This guarantees availability in production serverless environments
            // @ts-ignore
            let wasmBinary: ArrayBuffer | undefined;
            // @ts-ignore
            let dataBinary: ArrayBuffer | undefined;

            try {
                const startTime = Date.now();
                // @ts-ignore
                const { swissephWasm, swissephData } = require('./swisseph-binaries');
                seLog(`[SwissEph] Binaries required in ${Date.now() - startTime}ms. Decoding...`);

                const decodeStart = Date.now();
                wasmBinary = decodeBase64(swissephWasm);
                dataBinary = decodeBase64(swissephData);
                seLog(`[SwissEph] Decoded in ${Date.now() - decodeStart}ms. WASM: ${wasmBinary.byteLength}, DATA: ${dataBinary.byteLength}`);
            } catch (e) {
                console.error('[SwissEph] Failed to load/decode bundled binaries:', e);
            }

            // Fallback: file system reading (should rarely be reached if bundle exists)
            // Only keeping minimal logic here just in case, but bundle is primary.
            let wasmFilePath: string | undefined;

            // Initialize SwissEph manually to bypass library's ignoring of options
            // Use local vendored file to ensure CommonJS compatibility
            // @ts-ignore
            let WasamSwissEph = require('../swisseph-custom.js');

            // Handle ES Module default export
            if (typeof WasamSwissEph !== 'function' && WasamSwissEph.default) {
                WasamSwissEph = WasamSwissEph.default;
            }

            seLog(`[SwissEph] Instantiating Module manually. hasWasm: ${!!wasmBinary}, hasData: ${!!dataBinary}`);

            const moduleOptions = {
                // Pass Uint8Array directly
                wasmBinary: wasmBinary ? new Uint8Array(wasmBinary) : undefined,
                // Some versions accept 'ephe' or 'data' for the ephemeris data
                ephe: dataBinary ? new Uint8Array(dataBinary) : undefined,
                // Provide the pre-loaded data package to Emscripten
                getPreloadedPackage: (name: string, size: number) => {
                    if (name.endsWith('.data') && dataBinary) {
                        seLog(`[SwissEph] Providing pre-loaded package: ${name}`);
                        return dataBinary;
                    }
                    return null;
                },
                locateFile: (path: string, scriptDirectory: string) => {
                    if (path.endsWith('.wasm')) {
                        seLog('[SwissEph] LocateFile requested WASM: ' + path);
                        // If we have a file path from fs search, return it.
                        // Otherwise return the simple filename and hope the binary buffer we passed works.
                        if (wasmFilePath) return wasmFilePath;
                        return '/swisseph.wasm';
                    }
                    if (path.endsWith('.data')) {
                        seLog('[SwissEph] LocateFile requested DATA: ' + path);
                        return '/swisseph.data';
                    }
                    return path;
                },
                print: (str: string) => seLog('[SwissEph stdout]', str),
                printErr: (str: string) => console.error('[SwissEph stderr]', str)
            };

            // Initialize the module directly
            const sweModule = await WasamSwissEph(moduleOptions);

            // Create wrapper instance and inject the initialized module
            // @ts-ignore
            const instance = new SwissEph();
            // @ts-ignore
            instance.SweModule = sweModule;

            // Manually set ephe path (logic from library's initSwissEph)
            // @ts-ignore
            instance.set_ephe_path('sweph');

            seLog('[SwissEph] Initialization complete!');

            sweInstance = instance;
            return instance;
        })();
    }

    return swePromise;
}

// Dignity Configuration
const PLANET_DIGNITIES: Record<string, { exalted: string, debilitated: string, own: string[] }> = {
    'Sun': { exalted: 'Aries', debilitated: 'Libra', own: ['Leo'] },
    'Moon': { exalted: 'Taurus', debilitated: 'Scorpio', own: ['Cancer'] },
    'Mars': { exalted: 'Capricorn', debilitated: 'Cancer', own: ['Aries', 'Scorpio'] },
    'Mercury': { exalted: 'Virgo', debilitated: 'Pisces', own: ['Gemini', 'Virgo'] },
    'Jupiter': { exalted: 'Cancer', debilitated: 'Capricorn', own: ['Sagittarius', 'Pisces'] },
    'Venus': { exalted: 'Pisces', debilitated: 'Virgo', own: ['Taurus', 'Libra'] },
    'Saturn': { exalted: 'Libra', debilitated: 'Aries', own: ['Capricorn', 'Aquarius'] },
    'Rahu': { exalted: 'Taurus', debilitated: 'Scorpio', own: ['Aquarius'] },
    'Ketu': { exalted: 'Scorpio', debilitated: 'Taurus', own: ['Scorpio'] }
};


export function getVargaSign(longitude: number, division: number): { sign: string, signIndex: number } {
    const totalDivisions = 12 * division;
    const divisionSize = 360 / totalDivisions;
    const vargaIndex = Math.floor(longitude / divisionSize);

    // Standard Varga Calculation logic varies by division.
    // For many (D3, D7, D9, D12, D30), it follows specific cyclic rules.
    // Standard rule for most: (Starting Sign + remainder) % 12

    const rasiIndex = Math.floor(longitude / 30);
    const partInRasi = Math.floor((longitude % 30) / (30 / division));

    let finalSignIndex = 0;

    switch (division) {
        case 1: // Rashi
            finalSignIndex = rasiIndex;
            break;
        case 2: // Hora (D2)
            // Odd signs: Sun (Leo) first 15, Moon (Cancer) next 15
            // Even signs: Moon (Cancer) first 15, Sun (Leo) next 15
            const isOdd = (rasiIndex % 2) === 0; // 0=Aries (Odd)
            const isFirstHalf = (longitude % 30) < 15;
            if (isOdd) {
                finalSignIndex = isFirstHalf ? 4 : 3; // Leo : Cancer
            } else {
                finalSignIndex = isFirstHalf ? 3 : 4; // Cancer : Leo
            }
            break;
        case 3: // Drekkana (D3)
            // 1st part: Same Sign
            // 2nd part: 5th from it
            // 3rd part: 9th from it
            finalSignIndex = (rasiIndex + partInRasi * 4) % 12;
            break;
        case 4: // Chaturamsa (D4)
            // 1st, 2nd, 3rd, 4th parts: 1, 4, 7, 10 signs away
            finalSignIndex = (rasiIndex + partInRasi * 3) % 12;
            break;
        case 5: // Panchamsa (D5)
            // Odd: Aries, Aquarius, Sagittarius, Gemini, Libra
            // Even: Taurus, Virgo, Pisces, Capricorn, Scorpio
            const isOddD5 = (rasiIndex % 2) === 0; // 0=Aries(Odd)
            if (isOddD5) {
                if (partInRasi === 0) finalSignIndex = 0; // Aries
                else if (partInRasi === 1) finalSignIndex = 10; // Aquarius
                else if (partInRasi === 2) finalSignIndex = 8; // Sagittarius
                else if (partInRasi === 3) finalSignIndex = 2; // Gemini
                else finalSignIndex = 6; // Libra
            } else {
                if (partInRasi === 0) finalSignIndex = 1; // Taurus
                else if (partInRasi === 1) finalSignIndex = 5; // Virgo
                else if (partInRasi === 2) finalSignIndex = 11; // Pisces
                else if (partInRasi === 3) finalSignIndex = 9; // Capricorn
                else finalSignIndex = 7; // Scorpio
            }
            break;
        case 6: // Shashtamsa (D6)
            // Odd: Start from Aries
            // Even: Start from Libra
            const startD6 = (rasiIndex % 2 === 0) ? 0 : 6;
            finalSignIndex = (startD6 + partInRasi) % 12;
            break;
        case 7: // Saptamsa (D7)
            // Odd signs: Start from same sign
            // Even signs: Start from 7th sign
            const isOddSignD7 = (rasiIndex % 2) === 0;
            const startD7 = isOddSignD7 ? rasiIndex : (rasiIndex + 6) % 12;
            finalSignIndex = (startD7 + partInRasi) % 12;
            break;
        case 8: // Ashtamsa (D8)
            // Movable (1,4,7,10): Start from Aries (0)
            // Fixed (2,5,8,11): Start from Sagittarius (8)
            // Dual (3,6,9,12): Start from Leo (4)
            const mobilityD8 = rasiIndex % 3;
            let startD8 = 0;
            if (mobilityD8 === 0) startD8 = 0; // Movable -> Aries
            else if (mobilityD8 === 1) startD8 = 8; // Fixed -> Sag
            else if (mobilityD8 === 2) startD8 = 4; // Dual -> Leo
            finalSignIndex = (startD8 + partInRasi) % 12;
            break;
        case 9: // Navamsa (D9)
            // Fire: Aries, Earth: Capricorn, Air: Libra, Water: Cancer
            const element = rasiIndex % 4;
            let startD9 = 0;
            if (element === 0) startD9 = 0; // Fire -> Aries
            else if (element === 1) startD9 = 9; // Earth -> Capricorn
            else if (element === 2) startD9 = 6; // Air -> Libra
            else if (element === 3) startD9 = 3; // Water -> Cancer
            finalSignIndex = (startD9 + partInRasi) % 12;
            break;
        case 10: // Dasamsa (D10)
            // Odd signs: Start from same sign
            // Even signs: Start from 9th sign
            const isOddSignD10 = (rasiIndex % 2) === 0;
            const startD10 = isOddSignD10 ? rasiIndex : (rasiIndex + 8) % 12;
            finalSignIndex = (startD10 + partInRasi) % 12;
            break;
        case 12: // Dwadashamsa (D12)
            // Start from same sign
            finalSignIndex = (rasiIndex + partInRasi) % 12;
            break;
        case 16: // Shodashamsa (D16)
            // Movable: Aries, Fixed: Leo, Dual: Sagittarius
            const mobilityD16 = rasiIndex % 3;
            let startD16 = 0;
            if (mobilityD16 === 0) startD16 = 0; // Movable -> Aries
            else if (mobilityD16 === 1) startD16 = 4; // Fixed -> Leo
            else if (mobilityD16 === 2) startD16 = 8; // Dual -> Sag
            finalSignIndex = (startD16 + partInRasi) % 12;
            break;
        case 20: // Vimsamsa (D20)
            // Movable: Aries, Fixed: Sagittarius, Dual: Leo
            const mobilityD20 = rasiIndex % 3;
            let startD20 = 0;
            if (mobilityD20 === 0) startD20 = 0;
            else if (mobilityD20 === 1) startD20 = 8;
            else if (mobilityD20 === 2) startD20 = 4;
            finalSignIndex = (startD20 + partInRasi) % 12;
            break;
        case 24: // Chaturvimsamsa (D24)
            // Odd: Leo, Even: Cancer
            const startD24 = (rasiIndex % 2 === 0) ? 4 : 3;
            finalSignIndex = (startD24 + partInRasi) % 12;
            break;
        case 27: // Saptavimsamsa (D27)
            // Fire: Aries, Earth: Cancer, Air: Libra, Water: Capricorn
            const elementD27 = rasiIndex % 4;
            let startD27 = 0;
            if (elementD27 === 0) startD27 = 0;
            else if (elementD27 === 1) startD27 = 3;
            else if (elementD27 === 2) startD27 = 6;
            else if (elementD27 === 3) startD27 = 9;
            finalSignIndex = (startD27 + partInRasi) % 12;
            break;
        case 30: // Trimsamsa (D30)
            // This one has unique irregular bounds. Let's approximate or use standard parashari cycle for now
            // Parashari Trimsamsa:
            // Odd signs: Mars (0-5), Sat (5-10), Jup (10-18), Merc (18-25), Ven (25-30)
            // Even signs: Ven (0-5), Merc (5-12), Jup (12-20), Sat (20-25), Mars (25-30)
            const deg = longitude % 30;
            if (rasiIndex % 2 === 0) { // Odd
                if (deg < 5) finalSignIndex = 0; // Aries (Mars)
                else if (deg < 10) finalSignIndex = 10; // Aquarius (Sat)
                else if (deg < 18) finalSignIndex = 8; // Sag (Jup)
                else if (deg < 25) finalSignIndex = 5; // Virgo (Merc)
                else finalSignIndex = 1; // Taurus (Ven)
            } else { // Even
                if (deg < 5) finalSignIndex = 6; // Libra (Ven)
                else if (deg < 12) finalSignIndex = 2; // Gemini (Merc)
                else if (deg < 20) finalSignIndex = 11; // Pisces (Jup)
                else if (deg < 25) finalSignIndex = 9; // Cap (Sat)
                else finalSignIndex = 7; // Scorpio (Mars)
            }
            break;
        default:
            finalSignIndex = (rasiIndex + partInRasi) % 12;
    }

    const signs = [
        'Aries', 'Taurus', 'Gemini', 'Cancer',
        'Leo', 'Virgo', 'Libra', 'Scorpio',
        'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];

    return { sign: signs[finalSignIndex], signIndex: finalSignIndex };
}

export function getNavamsaSign(longitude: number): string {
    return getVargaSign(longitude, 9).sign;
}

export function getDignity(planetName: string, signName: string): string {
    const config = PLANET_DIGNITIES[planetName];
    if (!config) return 'Neutral';

    if (config.exalted === signName) return 'Exalted';
    if (config.debilitated === signName) return 'Debilitated';
    if (config.own.includes(signName)) return 'Own Sign';

    return 'Neutral'; // Simplified; typically would check Friends/Enemies
}

export async function calculateChart(
    year: number,
    month: number,
    day: number,
    hour: number,
    lat: number,
    lng: number,
    timezone: number = 5.5 // Default to IST (India)
): Promise<ChartData> {
    return serializeCalculation(async () => {
        const swe = await getSwe();
        if (typeof swe.calc_ut !== 'function') throw new Error('SwissEph instance not properly initialized: calc_ut missing');

        const PLANETS_CONFIG = {
            Sun: swe.SE_SUN ?? 0,
            Moon: swe.SE_MOON ?? 1,
            Mars: swe.SE_MARS ?? 4,
            Mercury: swe.SE_MERCURY ?? 2,
            Jupiter: swe.SE_JUPITER ?? 5,
            Venus: swe.SE_VENUS ?? 3,
            Saturn: swe.SE_SATURN ?? 6,
            Rahu: swe.SE_MEAN_NODE ?? 10,
        };

        const utcHour = hour - timezone;
        // @ts-expect-error - SwissEph julday might only take 4 args in some versions
        const julianDay = swe.julday(year, month, day, utcHour, swe.SE_GREG_CAL);
        swe.set_sid_mode(1, 0, 0); // Lahiri

        const calcFlags = 65538; // Speed + Sidereal
        const planets: Record<string, PlanetPosition> = {};
        // @ts-expect-error - SwissEph types might not match wasm signature
        const ayanamsa = swe.get_ayanamsa_ut(julianDay);

        for (const [name, id] of Object.entries(PLANETS_CONFIG)) {
            try {
                const posArr = swe.calc_ut(julianDay, id, calcFlags);
                if (!posArr || posArr.length < 3) continue;

                const pos = {
                    name,
                    longitude: posArr[0],
                    latitude: posArr[1],
                    distance: posArr[2],
                    speed: posArr[3] || 0,
                    isRetrograde: (posArr[3] || 0) < 0,
                };

                // Add D1 Sign
                const d1Sign = getZodiacSign(pos.longitude);

                // Add derived data
                const navamsaSign = getNavamsaSign(pos.longitude);
                const dignity = getDignity(name, d1Sign);

                planets[name] = { ...pos, house: 0, navamsaSign, dignity };

                if (name === 'Rahu') {
                    // Ketu is opposite Rahu
                    const ketuLong = (pos.longitude + 180) % 360;
                    const ketuD1Sign = getZodiacSign(ketuLong);
                    const ketuNavamsa = getNavamsaSign(ketuLong);
                    const ketuDignity = getDignity('Ketu', ketuD1Sign);

                    planets['Ketu'] = {
                        name: 'Ketu',
                        longitude: ketuLong,
                        latitude: -pos.latitude,
                        distance: pos.distance,
                        speed: pos.speed,
                        isRetrograde: pos.isRetrograde,
                        house: 0,
                        navamsaSign: ketuNavamsa,
                        dignity: ketuDignity
                    };
                }
            } catch (error) {
                console.error(`Error calculating ${name}:`, error);
            }
        }

        // Ascendant Calc
        let ascendant = 0;
        let mc = 0;

        try {
            const gmstHours = swe.sidtime(julianDay);
            let lstHours = gmstHours + (lng / 15.0);
            while (lstHours < 0) lstHours += 24;
            while (lstHours >= 24) lstHours -= 24;
            const ramc = lstHours * 15.0;
            const eclObj = swe.calc_ut(julianDay, -1, 0);
            const eps = (eclObj && eclObj.length) ? eclObj[0] : 23.43758;
            const d2r = Math.PI / 180.0;
            const r2d = 180.0 / Math.PI;
            const ramcRad = ramc * d2r;
            const epsRad = eps * d2r;
            const latRad = lat * d2r;
            const y = -Math.cos(ramcRad);
            const x = (Math.sin(ramcRad) * Math.cos(epsRad)) + (Math.tan(latRad) * Math.sin(epsRad));
            const ascRad = Math.atan2(y, x);
            let ascDeg = (ascRad * r2d) + 180;
            ascDeg = (ascDeg % 360 + 360) % 360;
            ascendant = (ascDeg - ayanamsa + 360) % 360;
            mc = (ramc - ayanamsa + 360) % 360;
        } catch (err) {
            console.error('Ascendant calc error', err);
            ascendant = planets.Sun?.longitude || 0;
        }

        // House Calc (Whole Sign)
        const ascSignStart = Math.floor(ascendant / 30) * 30;
        const houses: number[] = [];
        for (let i = 0; i < 12; i++) {
            houses.push((ascSignStart + i * 30) % 360);
        }

        // Calculate all Vargas
        const divisionsData: Record<string, { planets: Record<string, PlanetPosition>, ascendant: number, houses: number[] }> = {};
        const vargaList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20, 24, 27, 30];

        for (const div of vargaList) {
            const vPlanets: Record<string, PlanetPosition> = {};
            for (const [name, p] of Object.entries(planets)) {
                vPlanets[name] = {
                    ...p,
                    longitude: (getVargaSign(p.longitude, div).signIndex * 30 + (p.longitude % (30 / div)) * div) % 360,
                    house: 0 // Will handle later
                };
            }
            const vAsc = (getVargaSign(ascendant, div).signIndex * 30 + (ascendant % (30 / div)) * div) % 360;

            // House Calc (Whole Sign)
            const vAscSignStart = Math.floor(vAsc / 30) * 30;
            const vHouses: number[] = [];
            for (let i = 0; i < 12; i++) {
                vHouses.push((vAscSignStart + i * 30) % 360);
            }

            divisionsData[div === 1 ? 'D1' : `D${div}`] = {
                planets: vPlanets,
                ascendant: vAsc,
                houses: vHouses
            };
        }

        // Moon Chart (Chandra Kundli) - Moon becomes Ascendant
        const moonLong = planets['Moon']?.longitude || 0;
        const moonSignStart = Math.floor(moonLong / 30) * 30;
        const moonHouses: number[] = [];
        for (let i = 0; i < 12; i++) {
            moonHouses.push((moonSignStart + i * 30) % 360);
        }
        divisionsData['Moon'] = {
            planets,
            ascendant: moonLong,
            houses: moonHouses
        };

        // Calculate Vimsottari Dashas.
        //
        // Antardasha depth only (see DASHA_DEPTH_STORED). A full chart is what
        // gets written to Profile.chartData, and the deeper levels are a
        // 9^4 tree — measured at 7.5MB of JSON per profile, ~95% of the row,
        // for data nothing reads from storage. The timing page needs the deeper
        // levels, and gets them live from /api/astrology/dashas, which calls
        // calculateVimsottariDashas directly at full depth.
        const birthDateObj = new Date(year, month - 1, day, Math.floor(hour), Math.floor((hour % 1) * 60));
        const dashas = calculateVimsottariDashas(moonLong, birthDateObj, DASHA_DEPTH_STORED);

        return {
            planets,
            houses,
            ascendant,
            mc,
            navamsaAscendant: divisionsData['D9'].ascendant.toString(), // Keep for legacy if needed
            vargas: divisionsData,
            dashas: dashas
        };
    });
}


export const TITHIS = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

export const YOGAS = [
    'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'
];

export const KARANAS = [
    'Bava', 'Balav', 'Kaulav', 'Taitil', 'Gar', 'Vanij', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kintughna'
];

export const TARA_BALAS = [
    { name: 'Janma', interpretation: 'Potential physical or emotional intensity. Stay centered.' },
    { name: 'Sampat', interpretation: 'Wealth - A period of prosperity and tangible gains. Good for progress.' },
    { name: 'Vipat', interpretation: 'Obstacle - Potential losses or hurdles. Avoid high-risk actions.' },
    { name: 'Kshema', interpretation: 'Well-being - Protection and comfort. Excellent for health and recovery.' },
    { name: 'Pratyak', interpretation: 'Opposition - Misunderstandings or friction. Practice patience.' },
    { name: 'Sadhana', interpretation: 'Success - Favorable for spiritual and professional goals. High fulfillment.' },
    { name: 'Naidhana', interpretation: 'Destruction - High caution required. End of cycle themes.' },
    { name: 'Mitra', interpretation: 'Friend - Supportive energy and pleasant interactions.' },
    { name: 'Parama Mitra', interpretation: 'Best Friend - Great success and effortless flow.' }
];

export function calculateTaraBala(transitMoonLong: number, natalMoonLong: number) {
    const transitNakIdx = Math.floor(transitMoonLong / (360 / 27));
    const natalNakIdx = Math.floor(natalMoonLong / (360 / 27));

    const distance = (transitNakIdx - natalNakIdx + 27) % 27 + 1;
    const taraIdx = (distance - 1) % 9;

    return {
        ...TARA_BALAS[taraIdx],
        score: [1, 3, 5, 7].includes(taraIdx) ? 'challenging' : 'favorable'
    };
}

export const VARAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function calculateSunriseSunsetApproximation(year: number, month: number, day: number, lat: number, lng: number) {
    // A robust, standard JS approximation of solar noon, sunrise, and sunset without risking WASM timeouts.
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const diff = (date.getTime() - startOfYear.getTime()) + ((startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const dayOfYear = Math.floor(diff / 86400000);

    // Declination of the Sun
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
    const decRad = declination * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);

    // Hour Angle
    const hourAngleCos = -Math.tan(latRad) * Math.tan(decRad);
    let hourAngle = 90; // Default 6 hours if math exceeds bounds (e.g., poles)
    if (hourAngleCos >= -1 && hourAngleCos <= 1) {
        hourAngle = Math.acos(hourAngleCos) * (180 / Math.PI);
    }

    const sunriseOffsetHours = hourAngle / 15;
    const solarNoonUTC = 12 - (lng / 15);
    
    // In UTC hours
    let sunriseUTC = solarNoonUTC - sunriseOffsetHours;
    let sunsetUTC = solarNoonUTC + sunriseOffsetHours;

    // Adjust for date wrap
    if (sunriseUTC < 0) sunriseUTC += 24;
    if (sunsetUTC >= 24) sunsetUTC -= 24;

    return {
        sunriseUTC,
        sunsetUTC,
        solarNoonUTC
    };
}

export function calculateMuhurtas(year: number, month: number, day: number, lat: number, lng: number) {
    const { sunriseUTC, sunsetUTC, solarNoonUTC } = calculateSunriseSunsetApproximation(year, month, day, lat, lng);
    
    // Convert to target day Date objects in UTC
    const sunriseDate = new Date(Date.UTC(year, month - 1, day, Math.floor(sunriseUTC), (sunriseUTC % 1) * 60));
    let sunsetDate = new Date(Date.UTC(year, month - 1, day, Math.floor(sunsetUTC), (sunsetUTC % 1) * 60));
    // Handle wrap around if sunset crossed UTC midnight
    if (sunsetUTC < sunriseUTC) {
         sunsetDate = new Date(Date.UTC(year, month - 1, day + 1, Math.floor(sunsetUTC), (sunsetUTC % 1) * 60));
    }
    const noonDate = new Date(Date.UTC(year, month - 1, day, Math.floor(solarNoonUTC), (solarNoonUTC % 1) * 60));

    const dayDurationMs = sunsetDate.getTime() - sunriseDate.getTime();
    
    // 1. Rahu Kaalam & Yamaganda (Total day duration divided into 8 parts)
    const partMs = dayDurationMs / 8;
    const weekday = new Date(year, month - 1, day).getDay(); // Local day
    
    // Indices for parts (0-7): Sun, Mon, Tue, Wed, Thu, Fri, Sat
    const rahuParts = [7, 1, 6, 4, 5, 3, 2];
    const yamaParts = [4, 3, 2, 1, 0, 6, 5];

    const rahuStart = new Date(sunriseDate.getTime() + rahuParts[weekday] * partMs);
    const rahuEnd = new Date(rahuStart.getTime() + partMs);

    const yamaStart = new Date(sunriseDate.getTime() + yamaParts[weekday] * partMs);
    const yamaEnd = new Date(yamaStart.getTime() + partMs);

    // 2. Abhijit Muhurta (1/15th of day around Solar Noon)
    const abhijitDurationMs = dayDurationMs / 15;
    const abhijitStart = new Date(noonDate.getTime() - (abhijitDurationMs / 2));
    const abhijitEnd = new Date(noonDate.getTime() + (abhijitDurationMs / 2));

    const formatTime = (d: Date) => d.toISOString();

    return {
        sunrise: formatTime(sunriseDate),
        sunset: formatTime(sunsetDate),
        rahuKaalam: { start: formatTime(rahuStart), end: formatTime(rahuEnd) },
        yamaganda: { start: formatTime(yamaStart), end: formatTime(yamaEnd) },
        abhijit: { start: formatTime(abhijitStart), end: formatTime(abhijitEnd) }
    };
}

export async function calculatePanchang(
    year: number,
    month: number,
    day: number,
    hour: number,
    lat: number,
    lng: number
) {
    // Use timezone = 0 because inputs are already in UTC (implied by usage in route.ts)
    // Or we should update the function signature to accept timezone.
    // However, looking at route.ts, we pass UTC time. So let's force timezone 0 here to avoid double subtraction.
    const chart = await calculateChart(year, month, day, hour, lat, lng, 0);
    const sunLong = chart.planets.Sun.longitude;
    const moonLong = chart.planets.Moon.longitude;

    // 1. Tithi
    let diff = moonLong - sunLong;
    if (diff < 0) diff += 360;
    const tithiIndex = Math.floor(diff / 12);
    const tithiName = TITHIS[tithiIndex];
    const paksha = tithiIndex < 15 ? 'Shukla (Waxing)' : 'Krishna (Waning)';

    // 2. Vara
    const date = new Date(year, month - 1, day);
    const varaName = VARAS[date.getDay()];

    // 3. Nakshatra
    const nak = getNakshatra(moonLong);

    // 4. Yoga
    let totalLong = moonLong + sunLong;
    if (totalLong >= 360) totalLong -= 360;
    const yogaIndex = Math.floor(totalLong / (360 / 27));
    const yogaName = YOGAS[yogaIndex % 27];

    //5. Karana
    // Simplified Karana calculation
    const karanaIndex = Math.floor(diff / 6);
    let karanaName = '';
    if (karanaIndex === 0) karanaName = 'Kintughna';
    else if (karanaIndex >= 1 && karanaIndex <= 57) {
        karanaName = KARANAS[(karanaIndex - 1) % 7];
    } else {
        karanaName = KARANAS[karanaIndex - 51]; // Fixed Karanas at the end
    }

    const muhurtas = calculateMuhurtas(year, month, day, lat, lng);

    return {
        tithi: { name: tithiName, paksha, index: tithiIndex + 1 },
        vara: varaName,
        nakshatra: { name: nak.name, lord: nak.lord },
        yoga: yogaName,
        karana: karanaName,
        sunSign: getZodiacSign(sunLong),
        moonSign: getZodiacSign(moonLong),
        muhurtas
    };
}
