import { ChartData, getNavamsaSign, getDignity, getZodiacSign, getNakshatra } from './calculator';
import { SIGN_LORDS, SIGNS, getSignIndex, getAspects, getConjunctions } from './interpretations';
import { analyzePlanetAshtakavarga } from './ashtakavarga';
// Type and words both live there, and that file imports nothing that reaches
// the ephemeris — so a client component can read it without pulling in 16.8 MB
// of WASM behind the type.
import type { YogaFinding } from './conditions';

export type { YogaFinding };

/**
 * The findings that actually apply, for prompt context.
 *
 * detectYogas returns absent conditions too, because a report has to be able to
 * say "this does not apply to you". A prompt must not receive those: given a
 * list containing `present: false`, a model will find a way to mention it, and
 * "you do not have Kala Sarpa Yoga" is an alarming sentence to meet in a
 * reading that was about something else.
 */
export function presentYogas(findings: YogaFinding[]): YogaFinding[] {
    return findings.filter((f) => f.present);
}

export interface AnalysisResult {
    planet: string;
    coreTheme: string;
    functionalRole: string;
    behaviourZone: string;
    emotionalTone: string;
    dignityScore: number;
    dignityLabel: string;
    influences: string[];
    pressures: string[];
    load: number;
    loadClassification: string;
    repetitionCause: string;
    nakshatra: string;
    nakshatraLord: string;
    nakshatraPada: number;
    preciseDegree: string;
    synthesis: {
        theme: string;
        acts_in: string;
        feels_like: string;
        strength: string;
        challenge: string;
        repeats_when: string;
        balances_with: string;
    };
}

const PLANET_THEMES: Record<string, string> = {
    'Sun': 'Core identity, vitality, authority, and soul purpose.',
    'Moon': 'Mind, emotions, receptivity, and nurturing.',
    'Mars': 'Action, assertion, physical energy, and drive.',
    'Mercury': 'Communication, intellect, analysis, and skill.',
    'Jupiter': 'Wisdom, expansion, abundance, and higher learning.',
    'Venus': 'Love, beauty, relationships, and refinement.',
    'Saturn': 'Discipline, structure, karma, and endurance.',
    'Rahu': 'Ambition, obsession, innovation, and expansion.',
    'Ketu': 'Spiritual detachment, past patterns, and liberation.'
};

const HOUSE_DOMAINS: Record<number, string> = {
    1: 'Self, personality, physical identity',
    2: 'Values, wealth, speech, second house',
    3: 'Effort, siblings, communication',
    4: 'Home, emotions, mother, peace',
    5: 'Creativity, intelligence, ancestors',
    6: 'Struggle, service, health, competition',
    7: 'Partnership, others, public life',
    8: 'Transformation, secrets, longevity',
    9: 'Wisdom, higher path, father, grace',
    10: 'Performance, status, public action',
    11: 'Gains, community, larger vision',
    12: 'Release, solitude, subconscious'
};

const SIGN_TONES: Record<string, string> = {
    'Aries': 'Dynamic, assertive, impulsive',
    'Taurus': 'Stable, grounded, sensual',
    'Gemini': 'Adaptable, curious, communicative',
    'Cancer': 'Emotional, protective, nurturing',
    'Leo': 'Confident, expressive, dramatic',
    'Virgo': 'Analytical, methodical, precise',
    'Libra': 'Harmonious, balanced, social',
    'Scorpio': 'Intense, transformative, private',
    'Sagittarius': 'Optimistic, philosophical, expansive',
    'Capricorn': 'Disciplined, ambitious, structured',
    'Aquarius': 'Innovative, humanitarian, detached',
    'Pisces': 'Intuitive, compassionate, spiritual'
};

/**
 * Advanced Vedic Analysis Engine
 * Implements the "Chronological Analysis Framework"
 */
export class VedicAnalysisEngine {

    static analyze(chartData: ChartData): AnalysisResult[] {
        const results: AnalysisResult[] = [];
        const ascSignIndex = Math.floor(chartData.ascendant / 30);

        for (const [planetName, pos] of Object.entries(chartData.planets)) {
            const planetSignIndex = Math.floor(pos.longitude / 30);
            const signName = getZodiacSign(pos.longitude);
            const house = ((planetSignIndex - ascSignIndex + 12) % 12) + 1;

            // 1. Planet Identity
            const coreTheme = PLANET_THEMES[planetName] || 'Unknown';

            // 2. Functional Role (Based on Ascendant/Houses Ruled)
            const functionalRole = this.getFunctionalRole(planetName, ascSignIndex);

            // 3. House Placement
            const behaviourZone = HOUSE_DOMAINS[house] || 'Unknown';

            // 4. Sign Placement
            const emotionalTone = SIGN_TONES[signName] || 'Unknown';

            // 5. Dignity Scoring
            const dignityScore = this.calculateDignityScore(planetName, signName, pos);
            const dignityLabel = this.getDignityLabel(dignityScore);

            // 6. Associations (Conjunctions)
            const influences = getConjunctions(planetName, planetSignIndex, chartData.planets);

            // 7. Aspects
            const pressures = getAspects(planetName, planetSignIndex, chartData.planets);

            // 8. Load Calculation
            const load = this.calculateLoad(planetName, influences, pressures, functionalRole);
            const loadClassification = this.classifyLoad(load);

            // 9. Nakshatra Compulsion
            const nakData = getNakshatra(pos.longitude);
            const repetitionCause = nakData.name;
            const nakshatra = nakData.name;
            const nakshatraLord = nakData.lord;
            const nakshatraSize = 360 / 27;
            const nakshatraPada = Math.floor((pos.longitude % nakshatraSize) / (nakshatraSize / 4)) + 1;
            const preciseDegree = (pos.longitude % 30).toFixed(2);

            // 10. Synthesis
            const synthesis = this.synthesize(
                planetName, house, signName, dignityLabel, loadClassification,
                // Everything below was already computed here and simply not
                // passed in, which is why three synthesis fields were constants.
                influences, pressures, nakshatra, nakshatraLord
            );

            results.push({
                planet: planetName,
                coreTheme,
                functionalRole,
                behaviourZone,
                emotionalTone,
                dignityScore,
                dignityLabel,
                influences,
                pressures,
                load,
                loadClassification,
                repetitionCause,
                nakshatra,
                nakshatraLord,
                nakshatraPada,
                preciseDegree,
                synthesis
            });
        }

        return results;
    }

    private static getFunctionalRole(planet: string, ascIndex: number): string {
        // Basic Parashari Lordship
        // Kendra: 1, 4, 7, 10
        // Trikona: 1, 5, 9
        // Dusthana: 6, 8, 12

        // Find signs ruled by this planet
        const ruledSigns = Object.entries(SIGN_LORDS)
            .filter(([_, lord]) => lord === planet)
            .map(([sign, _]) => getSignIndex(sign));

        // Map signs to houses relative to Ascendant
        const ruledHouses = ruledSigns.map(sIdx => ((sIdx - ascIndex + 12) % 12) + 1);

        const isTrikonaLord = ruledHouses.some(h => [1, 5, 9].includes(h));
        const isDusthanaLord = ruledHouses.some(h => [6, 8, 12].includes(h));

        if (isTrikonaLord && !isDusthanaLord) return "Functional Benefic";
        if (isDusthanaLord && !isTrikonaLord) return "Functional Malefic";
        if (isTrikonaLord && isDusthanaLord) return "Mixed - Challenge & Growth";

        return "Neutral / Variable";
    }

    private static calculateDignityScore(planet: string, sign: string, pos: any): number {
        let score = 0;
        const basicDignity = getDignity(planet, sign);

        if (basicDignity === 'Exalted') score += 2;
        else if (basicDignity === 'Own Sign') score += 1;
        else if (basicDignity === 'Debilitated') score -= 2;

        if (pos.isRetrograde) score -= 0.5;
        // Combust check would happen here if we had Sun proximity

        return score;
    }

    private static getDignityLabel(score: number): string {
        if (score >= 2) return "High delivery capacity";
        if (score >= 0.5) return "Stable performance";
        if (score >= -0.5) return "Neutral / Learning Phase";
        return "Requires conscious handling";
    }

    private static calculateLoad(planet: string, influences: string[], pressures: string[], role: string): number {
        let load = 0;
        load += influences.length; // Conjunctions
        load += pressures.length;  // Aspects

        if (role === "Functional Malefic") load += 1;
        if (role === "Mixed - Challenge & Growth") load += 0.5;

        return load;
    }

    private static classifyLoad(load: number): string {
        if (load <= 2) return "Under-utilised";
        if (load <= 4) return "Balanced";
        if (load <= 6) return "Overloaded";
        return "Highly Pressured";
    }

    /**
     * The reader-facing half of a planet's analysis.
     *
     * Three of these fields used to be constants: `repeats_when` and
     * `balances_with` returned the same string for every planet in every chart
     * in the database, and `challenge` had two possible values. Sun and Ketu in
     * one test chart came back identical across all three. Since this is the
     * part a person actually reads, "personalised analysis" was ending in the
     * same generic sentence for everyone.
     *
     * They are now built from what the engine had already worked out a few
     * lines earlier and simply was not handing over — which planets aspect this
     * one, which pressure it, and the nakshatra it repeats through.
     */
    private static synthesize(
        planet: string,
        house: number,
        sign: string,
        dignity: string,
        load: string,
        influences: string[] = [],
        pressures: string[] = [],
        nakshatra: string = '',
        nakshatraLord: string = ''
    ): any {
        const list = (names: string[]) =>
            names.length === 1
                ? names[0]
                : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

        /* The difficulty a placement actually has, in the order that matters:
           a pressured planet's challenge is the pressure, not a generic one. */
        const challenge = pressures.length
            ? `Holding steady when ${list(pressures)} press on it — ${load === 'Highly Pressured'
                ? 'the combined weight is what tips into over-effort'
                : 'usually as urgency rather than obstruction'}`
            : load === 'Highly Pressured'
                ? 'Carrying more than this placement is built to hold at once'
                : `Giving ${HOUSE_DOMAINS[house] || 'this area'} enough attention for it to develop`;

        /* Nakshatra is the classical seat of compulsion, so naming it and its
           lord says something true about WHEN the pattern recurs rather than
           asserting that habit exists. */
        const repeats_when = nakshatra
            ? `${nakshatra} is triggered — its lord ${nakshatraLord} tends to replay the pattern before it is noticed`
            : 'The pattern runs before it is noticed';

        /* What actually steadies it: the planets already supporting it. */
        const balances_with = influences.length
            ? `The support of ${list(influences)}, which this placement can lean on deliberately`
            : `Deliberate pacing, since nothing else in the chart is steadying ${planet} directly`;

        return {
            theme: PLANET_THEMES[planet]?.split(',')[0] || 'Life energy',
            acts_in: HOUSE_DOMAINS[house] || 'Specific life areas',
            feels_like: SIGN_TONES[sign] || 'Unique vibration',
            strength: `${dignity} and ${load}`,
            challenge,
            repeats_when,
            balances_with
        };
    }

    /**
     * The four chart-level conditions this engine can decide, as FACTS.
     *
     * Every entry is returned whether or not it is present, because "you do not
     * have Mangal Dosha" is the answer most people searching the term actually
     * want, and a detector that can only say yes cannot give it.
     *
     * `factors` are the placements that produced the verdict and nothing else.
     * This used to return prose with the reading already inside it — Kala Sarpa
     * came back as "brings intense karmic extremes and profound spiritual
     * awakening", Gajakesari as "brings wisdom, respect, and lasting
     * reputation". Two things went wrong with that. The tone could not be
     * changed without editing a calculation, and the AI was handed a verdict
     * where it should have been handed a fact to interpret — which is the exact
     * separation the house rule about calculation before interpretation exists
     * to keep. The words now live in conditions.ts.
     */
    static detectYogas(chartData: ChartData): YogaFinding[] {
        const p = chartData.planets;
        const getSignIdx = (long: number) => Math.floor(long / 30);
        const findings: YogaFinding[] = [];

        // 1. Gajakesari — Jupiter in a kendra (1/4/7/10) from the Moon.
        {
            const factors: string[] = [];
            let present = false;
            if (p['Moon'] && p['Jupiter']) {
                const moonSign = getSignIdx(p['Moon'].longitude);
                const jupSign = getSignIdx(p['Jupiter'].longitude);
                const dist = ((jupSign - moonSign + 12) % 12) + 1;
                present = [1, 4, 7, 10].includes(dist);
                factors.push(`Jupiter sits ${dist} signs from the Moon`);
                factors.push(`Moon in ${SIGNS[moonSign]}, Jupiter in ${SIGNS[jupSign]}`);
            }
            findings.push({ key: 'gajakesari', name: 'Gajakesari Yoga', present, factors });
        }

        // 2. Kuja Dosha (Manglik) — Mars in 1, 4, 7, 8 or 12 from the ascendant.
        {
            const factors: string[] = [];
            let present = false;
            if (p['Mars']) {
                const ascSign = Math.floor(chartData.ascendant / 30);
                const marsSign = getSignIdx(p['Mars'].longitude);
                const marsHouse = ((marsSign - ascSign + 12) % 12) + 1;
                present = [1, 4, 7, 8, 12].includes(marsHouse);
                factors.push(`Mars in house ${marsHouse} from the ascendant`);
                factors.push(`Mars in ${SIGNS[marsSign]}`);
            }
            findings.push({ key: 'kuja-dosha', name: 'Mangal Dosha', present, factors });
        }

        // 3. Kemadruma — no true planet in the sign before or after the Moon.
        //    The Sun and the nodes are excluded, as the classical rule has it.
        {
            const factors: string[] = [];
            let present = false;
            if (p['Moon']) {
                const moonSign = getSignIdx(p['Moon'].longitude);
                const sign2 = (moonSign + 1) % 12;
                const sign12 = (moonSign + 11) % 12;
                const neighbours: string[] = [];

                for (const name of ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
                    if (!p[name]) continue;
                    const sign = getSignIdx(p[name].longitude);
                    if (sign === sign2 || sign === sign12) neighbours.push(name);
                }

                present = neighbours.length === 0;
                factors.push(`Moon in ${SIGNS[moonSign]}`);
                factors.push(
                    neighbours.length
                        ? `${neighbours.join(', ')} in the signs either side of it`
                        : 'No true planet in the sign either side of it'
                );
            }
            findings.push({ key: 'kemadruma', name: 'Kemadruma Yoga', present, factors });
        }

        // 4. Kala Sarpa — every classical planet on one side of the Rahu/Ketu axis.
        {
            const factors: string[] = [];
            let present = false;
            if (p['Rahu'] && p['Ketu']) {
                const rahuL = p['Rahu'].longitude;
                let allForward = true;
                let allBackward = true;
                const outside: string[] = [];

                for (const name of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
                    if (!p[name]) continue;
                    let dF = p[name].longitude - rahuL;
                    if (dF < 0) dF += 360;
                    if (dF > 180) allForward = false;
                    if (dF < 180) allBackward = false;
                }

                present = allForward || allBackward;
                if (!present) {
                    // Naming which planets break the hemming is the useful fact:
                    // it is why the condition does NOT apply.
                    for (const name of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
                        if (!p[name]) continue;
                        let dF = p[name].longitude - rahuL;
                        if (dF < 0) dF += 360;
                        if (dF > 180) outside.push(name);
                    }
                }

                factors.push(`Rahu in ${SIGNS[getSignIdx(rahuL)]}, Ketu opposite`);
                factors.push(
                    present
                        ? 'Every classical planet falls on one side of the nodal axis'
                        : `The axis is broken — ${outside.length ? outside.join(', ') : 'planets'} fall on the other side`
                );
            }
            findings.push({ key: 'kala-sarpa', name: 'Kala Sarpa Yoga', present, factors });
        }

        return findings;
    }

    /**
     * Sade Sati as a finding, in the same shape as the natal conditions.
     *
     * Separate from analyzeTransits, which already returns `{ active, phase }`
     * and has other callers whose shape should not move. This is the same fact
     * expressed the way /patterns consumes all five conditions.
     *
     * The one condition here that depends on TODAY rather than on birth, which
     * is why the phase matters: the three are not interchangeable.
     */
    static sadeSatiFinding(natal: ChartData, transit: ChartData): YogaFinding {
        const getSignIdx = (long: number) => Math.floor(long / 30);

        const natalMoonSign = natal.planets['Moon']
            ? getSignIdx(natal.planets['Moon'].longitude)
            : getSignIdx(natal.ascendant);

        const finding: YogaFinding = {
            key: 'sade-sati',
            name: 'Sade Sati',
            present: false,
            factors: [],
        };

        if (!transit.planets['Saturn']) return finding;

        const saturnSign = getSignIdx(transit.planets['Saturn'].longitude);
        const house = ((saturnSign - natalMoonSign + 12) % 12) + 1;

        const PHASES: Record<number, string> = {
            12: 'Rising',
            1: 'Peak',
            2: 'Setting',
        };

        finding.present = house === 12 || house === 1 || house === 2;
        if (finding.present) finding.phase = PHASES[house];

        finding.factors.push(`Moon in ${SIGNS[natalMoonSign]} at birth`);
        finding.factors.push(`Saturn now in ${SIGNS[saturnSign]}`);
        finding.factors.push(
            finding.present
                ? `That is ${house === 1 ? 'your Moon sign itself' : `the sign ${house === 12 ? 'before' : 'after'} it`}`
                : `That is ${house} signs from your Moon — outside the three Sade Sati covers`
        );

        return finding;
    }

    static analyzeTransits(natal: ChartData, transit: ChartData) {
        const getSignIdx = (long: number) => Math.floor(long / 30);
        
        let natalMoonSign = getSignIdx(natal.ascendant);
        if (natal.planets['Moon']) {
            natalMoonSign = getSignIdx(natal.planets['Moon'].longitude);
        }
        
        const keyTransits: string[] = [];
        let sadeSatiActive = false;
        let sadeSatiPhase = '';
        let jupiterBlessing = false;
        let rahuKetuAxis = '';

        // 1. Sade Sati (Saturn transit relating to Natal Moon)
        if (transit.planets['Saturn']) {
            const saturnSign = getSignIdx(transit.planets['Saturn'].longitude);
            const saturnHouse = (saturnSign - natalMoonSign + 12) % 12 + 1;
            
            if (saturnHouse === 12) {
                sadeSatiActive = true; sadeSatiPhase = 'Rising';
                keyTransits.push("Sade Sati (Rising Phase): Saturn is transiting the 12th house from your Moon. A period of letting go, internal preparation, and facing subconscious fears.");
            } else if (saturnHouse === 1) {
                sadeSatiActive = true; sadeSatiPhase = 'Peak';
                keyTransits.push("Sade Sati (Peak Phase): Saturn is transiting over your natal Moon. A crucial phase of deep psychological restructuring, pressure, and maturity.");
            } else if (saturnHouse === 2) {
                sadeSatiActive = true; sadeSatiPhase = 'Setting';
                keyTransits.push("Sade Sati (Setting Phase): Saturn is transiting the 2nd house from your Moon. Focus shifts to financial restructuring, family values, and bringing these heavy karmic lessons to a close.");
            }
        }

        // 2. Jupiter blessings
        if (transit.planets['Jupiter']) {
            const jupSign = getSignIdx(transit.planets['Jupiter'].longitude);
            const jupHouse = (jupSign - natalMoonSign + 12) % 12 + 1;
            if ([5, 7, 9].includes(jupHouse)) {
                jupiterBlessing = true;
                keyTransits.push(`Jupiter Blessing: Jupiter transit in the ${jupHouse}th house from your Moon indicates a period of grace, expansion, teaching, and spiritual protection.`);
            }
            if (jupHouse === 1) {
                keyTransits.push(`Jupiter Return / Conjunction: Jupiter transiting your Moon sign brings a new 12-year cycle of personal growth and emotional expansion.`);
            }
        }

        // 3. Rahu/Ketu Axis
        if (transit.planets['Rahu'] && transit.planets['Ketu']) {
            const rahuSign = getSignIdx(transit.planets['Rahu'].longitude);
            const rahuHouse = (rahuSign - natalMoonSign + 12) % 12 + 1;
            const ketuSign = getSignIdx(transit.planets['Ketu'].longitude);
            const ketuHouse = (ketuSign - natalMoonSign + 12) % 12 + 1;
            
            rahuKetuAxis = `${rahuHouse}/${ketuHouse}`;
            keyTransits.push(`Karmic Axis: The Nodes are transiting the ${rahuHouse}/${ketuHouse} houses from your Moon, shifting your collective karma between obsession (${rahuHouse}H) and detachment (${ketuHouse}H).`);
        }

        const ashtakavargaScores = [];
        const traditional = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
        for (const p of traditional) {
            if (transit.planets[p]) {
                const score = analyzePlanetAshtakavarga(natal, p, transit.planets[p].longitude);
                ashtakavargaScores.push(score);
            }
        }

        return {
            sadeSati: { active: sadeSatiActive, phase: sadeSatiPhase },
            jupiterBlessing,
            rahuKetuAxis,
            keyTransits,
            ashtakavargaScores
        };
    }
}
