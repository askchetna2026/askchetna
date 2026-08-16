import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calculateTaraBala } from '@/lib/astrology/calculator';
import { calculateAshtakoota } from '@/lib/astrology/ashtakoota';
import { generateSynastryResponse } from '@/lib/ai/geminiService';
import { guardAiSpend } from '@/lib/ai/costGuard';
import { applyUserLanguage } from '@/lib/i18n/context';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        // The id, not just the session: this call costs money at the provider
        // and the limit below has to attach to somebody.
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // The seeker's language, attached to this request so every prompt
        // rendered below picks it up. See src/lib/i18n/context.ts.
        await applyUserLanguage(session.user.id);

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

        // 1. The deterministic layer, FIRST.
        //
        // This route used to compute Tara Bala — one of the eight kutas — and
        // then hand two raw charts to a language model, which meant the "match"
        // was an AI's impression rather than a calculation. Ashtakoota is the
        // actual traditional matching, and it runs before anything interprets.
        const moonA = chartA.planets.Moon.longitude;
        const moonB = chartB.planets.Moon.longitude;

        const taraA = calculateTaraBala(moonB, moonA);
        const taraB = calculateTaraBala(moonA, moonB);
        const ashtakoota = calculateAshtakoota(chartA, chartB);

        // 2. AI interpretation, given the numbers rather than asked to invent them.
        const aiResponse = await generateSynastryResponse(chartA, chartB, {
            a: personA.name,
            b: personB.name
        });

        return NextResponse.json({
            ashtakoota,
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
