import { NextResponse } from 'next/server';
import { calculateChart, getZodiacSign } from '@/lib/astrology/calculator';
import { cached, utcHourKey } from '@/lib/astrology/skyCache';

/**
 * Today's cosmic weather — the same for everybody.
 *
 * This handler takes no parameters, reads no session and looks at no profile.
 * Everything it returns is a function of the current instant: the Moon's sign,
 * and the weekday tables below. Yet it was loading and running the ephemeris on
 * every request, from every visitor, on both the home page and /today — twice
 * per visit, since EnergyWidget and TodayScreen each fetch it independently.
 *
 * So it is computed once per UTC hour and served to everyone, in-process and at
 * the CDN. Nothing personal passes through here, which is what makes the shared
 * public cache safe.
 */

// Helper to calculate Rahu Kaal (inauspicious period)
function calculateRahuKaal(date: Date): string {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Rahu Kaal periods (approximate 1.5 hour windows based on sunrise ~6 AM)
    const rahuKaalPeriods: Record<number, string> = {
        0: '4:30 PM - 6:00 PM', // Sunday
        1: '7:30 AM - 9:00 AM', // Monday
        2: '3:00 PM - 4:30 PM', // Tuesday
        3: '12:00 PM - 1:30 PM', // Wednesday
        4: '1:30 PM - 3:00 PM', // Thursday
        5: '10:30 AM - 12:00 PM', // Friday
        6: '9:00 AM - 10:30 AM', // Saturday
    };

    return rahuKaalPeriods[dayOfWeek] || '12:00 PM - 1:30 PM';
}

// Helper to get auspicious time (Abhijit Muhurta)
function getAuspiciousTime(): string {
    // Abhijit Muhurta is typically around midday (11:30 AM - 12:30 PM)
    return '11:30 AM - 12:30 PM';
}

// Helper to get lucky number based on day of week
function getLuckyNumber(date: Date): number {
    const dayOfWeek = date.getDay();
    const luckyNumbers = [3, 2, 9, 5, 3, 6, 8]; // Sun-Sat
    return luckyNumbers[dayOfWeek];
}

// Helper to get lucky color based on day of week
function getLuckyColor(date: Date): string {
    const dayOfWeek = date.getDay();
    const luckyColors = ['Gold', 'Silver', 'Red', 'Green', 'Yellow', 'White', 'Purple']; // Sun-Sat
    return luckyColors[dayOfWeek];
}

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
    const rahuKaal = calculateRahuKaal(now);
    const auspiciousTime = getAuspiciousTime();
    const luckyNumber = getLuckyNumber(now);
    const luckyColor = getLuckyColor(now);

    return {
        transit: `Moon in ${moonSign}`,
        theme: currentTheme.theme,
        prompt: currentTheme.prompt,
        description: currentTheme.description,
        luckyColor,
        luckyNumber,
        auspiciousTime,
        rahuKaal,
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
