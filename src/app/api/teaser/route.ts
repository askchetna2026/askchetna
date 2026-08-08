import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { rateLimit, getClientIp } from '@/lib/rateLimit';

interface TeaserResponse {
    sign: string;
    sanskritName: string;
    theme: string;
    reading: string;
}

export async function GET(req: NextRequest) {
    try {
        const limit = rateLimit(`teaser:${getClientIp(req)}`, { limit: 20, windowMs: 60 * 1000 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please slow down.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
            );
        }

        const { searchParams } = new URL(req.url);
        const dobStr = searchParams.get('dob');

        if (!dobStr) {
            return NextResponse.json({ error: 'Missing dob parameter' }, { status: 400 });
        }

        const date = new Date(dobStr);
        if (isNaN(date.getTime())) {
            return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
        }

        const month = date.getUTCMonth() + 1; // 1-indexed
        const day = date.getUTCDate();

        let sign = '';
        let sanskritName = '';
        let theme = '';
        let reading = '';

        // Sidereal (Vedic) Sun Sign Date Mapping
        if ((month === 4 && day >= 14) || (month === 5 && day <= 14)) {
            sign = 'Aries';
            sanskritName = 'Mesha';
            theme = 'Dynamic action, pioneering courage, and impulse';
            reading = 'Your Sun in Aries (Mesha) shines with pioneering courage. You are designed to initiate new beginnings and trust your gut instinct. Sometimes, you feel an intense pressure to act immediately; your path is learning to balance raw passion with patient strategy. Observe your patterns of impatience today.';
        } else if ((month === 5 && day >= 15) || (month === 6 && day <= 14)) {
            sign = 'Taurus';
            sanskritName = 'Vrishabha';
            theme = 'Stabilizing comfort, steady growth, and sensory beauty';
            reading = 'Your Sun in Taurus (Vrishabha) brings a grounding, calming presence. You seek beauty, stability, and quiet reliability in all areas of life. In a fast-moving world, you act as the anchor. Your challenge lies in recognizing when comfort becomes stagnation, and learning when it is time to release control.';
        } else if ((month === 6 && day >= 15) || (month === 7 && day <= 15)) {
            sign = 'Gemini';
            sanskritName = 'Mithuna';
            theme = 'Curiosity, mental agility, and communication';
            reading = 'Your Sun in Gemini (Mithuna) is a spark of endless curiosity. You thrive on learning, sharing, and connecting disparate ideas. Your mind is always scanning for patterns. Your growth comes from narrowing your focus, so your mental energy becomes a powerful laser rather than a scatter of light.';
        } else if ((month === 7 && day >= 16) || (month === 8 && day <= 16)) {
            sign = 'Cancer';
            sanskritName = 'Karka';
            theme = 'Emotional depth, nurturing protection, and intuition';
            reading = 'Your Sun in Cancer (Karka) indicates a deeply intuitive, feeling nature. You feel the underlying atmosphere of a room instantly and protect your emotional circle. Your path is to build a secure inner home, so you can nurture others without absorbing their emotional storms.';
        } else if ((month === 8 && day >= 17) || (month === 9 && day <= 16)) {
            sign = 'Leo';
            sanskritName = 'Simha';
            theme = 'Radiant warmth, creative leadership, and heart expression';
            reading = 'Your Sun in Leo (Simha) shines with noble warmth and creative expression. You seek to live from the heart and inspire those around you. However, you may carry a hidden fear of being unseen or unappreciated; your lesson is to find validation from within rather than chasing external applause.';
        } else if ((month === 9 && day >= 17) || (month === 10 && day <= 16)) {
            sign = 'Virgo';
            sanskritName = 'Kanya';
            theme = 'Discernment, practical refinement, and service';
            reading = 'Your Sun in Virgo (Kanya) has a gift for discernment and refinement. You see details others miss and find deep fulfillment in helpful service. Beware of hyper-criticism towards yourself and others; your journey is to realize that life\'s imperfections are part of its sacred order.';
        } else if ((month === 10 && day >= 17) || (month === 11 && day <= 15)) {
            sign = 'Libra';
            sanskritName = 'Tula';
            theme = 'Harmonizing relationships, aesthetic balance, and justice';
            reading = 'Your Sun in Libra (Tula) is a force for harmony, justice, and relational connection. You seek beauty and balance in all things. Your challenge is the fear of conflict or decision paralysis; your path is to realize that standing in your truth is the highest form of harmony.';
        } else if ((month === 11 && day >= 16) || (month === 12 && day <= 15)) {
            sign = 'Scorpio';
            sanskritName = 'Vrishchika';
            theme = 'Intensity, psychological truth, and transformation';
            reading = 'Your Sun in Scorpio (Vrishchika) holds a magnetic, intense presence. You are drawn to what is hidden, seeking deep emotional truth and transformation. Your primary lesson is trust: releasing the urge to guard yourself allows you to access true, collaborative power.';
        } else if ((month === 12 && day >= 16) || (month === 1 && day <= 13)) {
            sign = 'Sagittarius';
            sanskritName = 'Dhanu';
            theme = 'Philosophical seekership, expansion, and idealism';
            reading = 'Your Sun in Sagittarius (Dhanu) is on a perpetual quest for truth, meaning, and expansion. You see life as a grand journey and hold high ideals. Your challenge is restless idealism; your path is learning to find the sacred in the mundane here and now, anchoring your dreams.';
        } else if ((month === 1 && day >= 14) || (month === 2 && day <= 12)) {
            sign = 'Capricorn';
            sanskritName = 'Makara';
            theme = 'Long-term building, disciplined focus, and responsibility';
            reading = 'Your Sun in Capricorn (Makara) carries the steady discipline of the builder. You respect time, responsibility, and long-term structure. You may carry a heavy sense of burden; your growth is in learning to soften, celebrate your progress, and trust the natural flow of life.';
        } else if ((month === 2 && day >= 13) || (month === 3 && day <= 14)) {
            sign = 'Aquarius';
            sanskritName = 'Kumbha';
            theme = 'Visionary thinking, collective service, and independence';
            reading = 'Your Sun in Aquarius (Kumbha) is a visionary tuned to the collective future. You think independently and value community, seeking unconventional pathways. Your growth comes from connecting with your individual feelings, bridging cold logic with warm empathy.';
        } else {
            sign = 'Pisces';
            sanskritName = 'Meena';
            theme = 'Sensitivity, imaginative dreamscape, and spiritual release';
            reading = 'Your Sun in Pisces (Meena) swims in boundaryless sensitivity and spiritual release. You feel the underlying unity of all things and possess a rich imagination. Your task is to build healthy boundaries, so you do not lose yourself in the ocean of others\' experiences.';
        }

        const response: TeaserResponse = {
            sign,
            sanskritName,
            theme,
            reading
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Teaser API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
