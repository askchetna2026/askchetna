import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generatePlanetInsights } from '@/lib/ai/geminiService';
import { ChartData } from '@/lib/astrology/calculator';
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

        const limited = guardAiSpend(session.user.id, 'planet-insights');
        if (limited) return limited;

        const { chartData, chartName, complexity } = await req.json();

        if (!chartData || !chartName) {
            return NextResponse.json({ error: 'Missing chart data or name' }, { status: 400 });
        }

        const insights = await generatePlanetInsights(chartData as ChartData, chartName, complexity);

        return NextResponse.json({ insights });

    } catch (error) {
        console.error('Planet insights error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
