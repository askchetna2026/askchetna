import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calculateTaraBala } from '@/lib/astrology/calculator';
import { generateSynastryResponse } from '@/lib/ai/geminiService';
import { guardAiSpend } from '@/lib/ai/costGuard';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        // The id, not just the session: this call costs money at the provider
        // and the limit below has to attach to somebody.
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limited = guardAiSpend(session.user.id, 'synastry');
        if (limited) return limited;

        const { personA, personB } = await req.json();

        if (!personA || !personB) {
            return NextResponse.json({ error: 'Two profiles are required for synastry' }, { status: 400 });
        }

        const chartA = personA.chartData;
        const chartB = personB.chartData;

        if (!chartA || !chartB) {
            return NextResponse.json({ error: 'Charts must be generated first' }, { status: 400 });
        }

        // 1. Calculate basic cross-chart patterns
        const moonA = chartA.planets.Moon.longitude;
        const moonB = chartB.planets.Moon.longitude;

        // Tara Bala
        const taraA = calculateTaraBala(moonB, moonA);
        const taraB = calculateTaraBala(moonA, moonB);

        // 2. AI Analysis
        const aiResponse = await generateSynastryResponse(chartA, chartB, {
            a: personA.name,
            b: personB.name
        });

        return NextResponse.json({
            taraBala: {
                personA_affectedByB: taraA,
                personB_affectedByA: taraB
            },
            aiAnalysis: aiResponse
        });

    } catch (error) {
        console.error('Synastry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
