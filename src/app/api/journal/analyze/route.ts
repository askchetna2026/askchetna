import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { generateJournalAnalysis } from '@/lib/ai/geminiService';
import { guardAiSpend } from '@/lib/ai/costGuard';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limited = guardAiSpend(session.user.id, 'journal-analyze');
        if (limited) return limited;

        const { date, content } = await req.json();

        if (!content || content.length < 10) {
            return NextResponse.json({ error: 'Reflection too short for meaningful analysis' }, { status: 400 });
        }

        // 1. Get the user's primary profile (simplification: first one)
        const profile = await prisma.profile.findFirst({
            where: { userId: session.user.id }
        });

        if (!profile || !profile.chartData) {
            return NextResponse.json({ error: 'Profile and chart data required' }, { status: 400 });
        }

        const chartData = profile.chartData as any;
        const now = new Date();

        // 2. Find current Dasha and Antardasha
        const currentDasha = { lord: 'Unknown', antardasha: 'Unknown' };
        if (chartData.dashas) {
            const mDasha = chartData.dashas.find((d: any) => {
                const start = new Date(d.start);
                const end = new Date(d.end);
                return now >= start && now < end;
            });

            if (mDasha) {
                currentDasha.lord = mDasha.lord;
                if (mDasha.antardashas) {
                    const aDasha = mDasha.antardashas.find((ad: any) => {
                        const start = new Date(ad.start);
                        const end = new Date(ad.end);
                        return now >= start && now < end;
                    });
                    if (aDasha) {
                        currentDasha.antardasha = aDasha.lord;
                    }
                }
            }
        }

        // 3. Generate AI Analysis
        const analysis = await generateJournalAnalysis(content, chartData, currentDasha);

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('Journal analysis error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
