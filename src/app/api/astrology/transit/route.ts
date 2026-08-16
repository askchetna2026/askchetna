import { NextResponse } from 'next/server';
import { calculateChart, getZodiacSign } from '@/lib/astrology/calculator';
import { cached, utcHourKey } from '@/lib/astrology/skyCache';

/**
 * Today's cosmic weather — the same for everybody.
 *
 * This handler takes no parameters, reads no session and looks at no profile.
 * Everything it returns is a function of the current instant: the Moon's sign
 * and the reading that goes with it. Yet it was loading and running the
 * ephemeris on every request, from every visitor, on both the home page and
 * /today — twice per visit, since EnergyWidget and TodayScreen each fetch it
 * independently.
 *
 * So it is computed once per UTC hour and shared by every caller. Nothing
 * personal passes through here, which is what makes one shared answer safe.
 *
 * The `public, s-maxage` below is currently INERT on Vercel: `src/proxy.ts`
 * matches everything except `api/auth`, and a path that runs Edge middleware is
 * never served from the CDN — measured, `X-Vercel-Cache: MISS` on every request
 * and the s-maxage directives stripped from the response. The header is left in
 * place because it costs nothing and becomes real the day this path is excluded
 * from the matcher. Until then the in-process memo is what does the work, which
 * is the part that matters: it is what keeps the 12 MB ephemeris off the
 * request.
 */

/* This route used to also return Rahu Kaal, an "auspicious time", a lucky
   number and a lucky colour. None of them were calculated.
 *
 * Rahu Kaal was a seven-entry table keyed on the day of the week, assuming
 * sunrise at 6 AM everywhere; Abhijit was the constant string
 * "11:30 AM - 12:30 PM". They could not be anything better here, because this
 * response is memoised globally on the UTC hour and has no seeker to have
 * coordinates. Meanwhile /api/astrology/panchang computes both properly from
 * real sunrise and sunset at the profile's own location — so the same person
 * was shown one Rahu Kaal on the home page and a different one on /today.
 *
 * Lucky number and lucky colour were likewise arrays indexed by weekday,
 * identical for every user alive on a given day and presented as personal.
 * They were also the only fortune-telling in the product, on a site whose
 * About page says in as many words that it rejects that framing.
 *
 * All four are gone rather than fixed. The widget now reads the real panchang.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Everything the widget shows, derived from `now` and nothing else. */
async function computeSkyWeather(now: Date) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const hour = now.getUTCHours() + (now.getUTCMinutes() / 60);

    // Calculate for 0,0 (Global/Cosmic weather doesn't depend heavily on local houses for just planet positions, 
    // but we'll use a neutral location for general sign placement)
    const chartData = await calculateChart(year, month, day, hour, 0, 0);

    const moonPos = chartData.planets['Moon'].longitude;
    const moonSign = getZodiacSign(moonPos);

    interface ThemeData {
        theme: string;
        prompt: string;
        description: string;
    }

    const themes: Record<string, ThemeData> = {
        'Aries': {
            theme: 'Active Initiative',
            prompt: 'Where is your intuition pushing you to start something new today?',
            description: 'The Moon in Aries brings a surge of dynamic, pioneering energy. This is a time when emotional courage peaks and instinctive action feels natural. You may feel restless, driven to initiate projects, assert your independence, or break free from stagnation. This fiery lunar placement encourages bold self-expression and trusting your gut impulses, though impulsiveness should be tempered with awareness.'
        },
        'Taurus': {
            theme: 'Steady Presence',
            prompt: 'What small physical comfort can you fully appreciate right now?',
            description: 'The Moon in Taurus anchors your emotions in the sensory world, inviting you to slow down and savor stability. This earthy lunar energy emphasizes comfort, security, and tangible pleasures—food, nature, touch, and beauty. It\'s a favorable time for grounding practices, financial planning, and cultivating patience. Emotional needs center around predictability and physical well-being, making this an ideal period for self-care routines.'
        },
        'Gemini': {
            theme: 'Curious Exchange',
            prompt: 'What is one new perspective you encountered today?',
            description: 'The Moon in Gemini activates mental curiosity and social connectivity. Emotions become lighter, more versatile, and easily influenced by conversations and new information. This airy lunar placement supports learning, networking, multitasking, and playful communication. However, emotional restlessness or overthinking may arise. Channel this energy into journaling, creative writing, or engaging discussions that satisfy your need for mental stimulation and variety.'
        },
        'Cancer': {
            theme: 'Nurturing Flow',
            prompt: 'How are you protecting your inner softness today?',
            description: 'The Moon in Cancer is in its own sign, amplifying emotional sensitivity, intuition, and the need for safety and belonging. This watery lunar energy deepens connections to home, family, and your inner child. You may feel more protective, sentimental, or nostalgic. It\'s a powerful time for emotional healing, nurturing others, and honoring your feelings without judgment. Create space for stillness and emotional honesty today.'
        },
        'Leo': {
            theme: 'Radiant Expression',
            prompt: 'What part of your heart is asking to be seen?',
            description: 'The Moon in Leo illuminates your need for recognition, creative self-expression, and joyful play. This fiery lunar placement encourages you to step into the spotlight, share your gifts, and embrace your authentic charisma. Emotions are warm, generous, and sometimes dramatic. It\'s an excellent time for artistic pursuits, romantic gestures, and activities that celebrate your individuality. Let your inner light shine without seeking external validation.'
        },
        'Virgo': {
            theme: 'Refined Focus',
            prompt: 'What small chaos can you gently bring into order today?',
            description: 'The Moon in Virgo brings emotional fulfillment through organization, service, and practical problem-solving. This earthy lunar energy supports attention to detail, health-conscious choices, and refinement of daily routines. You may feel emotionally soothed by productivity, cleanliness, or helping others. However, perfectionism and self-criticism can arise. Focus on progress over perfection, and channel this discerning energy into meaningful, skillful work.'
        },
        'Libra': {
            theme: 'Balanced Connection',
            prompt: 'Where is a bridge needing to be built in your life right now?',
            description: 'The Moon in Libra awakens your emotional need for harmony, partnership, and beauty. This airy lunar placement supports diplomacy, collaboration, and aesthetic appreciation. You may feel more socially oriented, seeking balance in relationships and environments. This is an ideal time for mediation, creative collaboration, or simply enjoying art, music, and pleasant company. Avoid people-pleasing—true balance honors both your needs and others.'
        },
        'Scorpio': {
            theme: 'Deep Integration',
            prompt: 'What truth are you finally ready to look at?',
            description: 'The Moon in Scorpio intensifies emotional depth, psychological insight, and transformative power. This watery lunar energy invites you to explore hidden feelings, confront fears, and embrace emotional truth with courage. You may feel compelled to release what no longer serves you or to deepen intimate bonds. This is a potent time for shadow work, healing old wounds, and accessing your innate resilience and regenerative capacity.'
        },
        'Sagittarius': {
            theme: 'Expansive Vision',
            prompt: 'What belief is feeling too small for you lately?',
            description: 'The Moon in Sagittarius ignites emotional optimism, philosophical inquiry, and a thirst for adventure. This fiery lunar energy encourages you to expand beyond familiar boundaries—whether through travel, learning, or exploring new belief systems. You may feel restless, seeking meaning and inspiration. Channel this energy into exploration, teaching, or vision-setting. Avoid dogmatism and remain open to diverse perspectives that broaden your worldview.'
        },
        'Capricorn': {
            theme: 'Grounded Authority',
            prompt: 'What responsibility feels like a privilege today?',
            description: 'The Moon in Capricorn brings emotional maturity, discipline, and a focus on long-term goals. This earthy lunar placement supports ambition, structural thinking, and responsible action. You may feel emotionally fulfilled through achievement, mastery, or contributing to something enduring. This is an excellent time for planning, leadership, and committing to meaningful work. Balance ambition with self-compassion, and honor the journey as much as the destination.'
        },
        'Aquarius': {
            theme: 'Collective Insight',
            prompt: 'How are you different from the crowd in a way that helps the crowd?',
            description: 'The Moon in Aquarius awakens emotional detachment, innovation, and humanitarian ideals. This airy lunar energy encourages you to embrace your uniqueness, think progressively, and connect with like-minded communities. You may feel inspired to contribute to collective causes or to experiment with unconventional ideas. This is a favorable time for networking, technological pursuits, and honoring your individuality while serving the greater good.'
        },
        'Pisces': {
            theme: 'Soulful Release',
            prompt: 'What are you letting go of to make room for the new?',
            description: 'The Moon in Pisces dissolves emotional boundaries, inviting compassion, imagination, and spiritual connection. This watery lunar energy heightens intuition, empathy, and the desire to merge with something greater than yourself. You may feel dreamy, artistic, or called to solitude and reflection. This is a powerful time for meditation, creative expression, and releasing what no longer serves your soul\'s evolution. Trust the unseen currents guiding you.'
        }
    };

    const currentTheme = themes[moonSign] || themes['Pisces'];

    return {
        transit: `Moon in ${moonSign}`,
        theme: currentTheme.theme,
        prompt: currentTheme.prompt,
        description: currentTheme.description,
    };
}

export async function GET() {
    const now = new Date();

    try {
        const sky = await cached(`transit:${utcHourKey(now)}`, HOUR_MS, () => computeSkyWeather(now));

        return NextResponse.json(
            // `timestamp` stays outside the cached value: it says when this
            // answer was served, and a frozen one would be a lie about freshness.
            { ...sky, timestamp: now.toISOString() },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            }
        );
    } catch (error: unknown) {
        console.error('Transit API error:', error);
        return NextResponse.json({
            error: 'Failed to calculate transit',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
