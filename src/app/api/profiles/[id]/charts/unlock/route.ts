import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeSendLowCreditLifecycleEmail } from '@/lib/lifecycleEmails';

const VARGA_DEFINITIONS: Record<string, { title: string }> = {
    'D1': { title: 'D1 (Rashi Chart)' },
    'Moon': { title: 'Moon Chart' },
    'D2': { title: 'D2 (Hora Chart)' },
    'D3': { title: 'D3 (Drekkana Chart)' },
    'D4': { title: 'D4 (Chaturamsa Chart)' },
    'D7': { title: 'D7 (Saptamsa Chart)' },
    'D9': { title: 'D9 (Navamsa Chart)' },
    'D10': { title: 'D10 (Dasamsa Chart)' },
    'D12': { title: 'D12 (Dwadashamsa Chart)' },
    'D16': { title: 'D16 (Shodashamsa Chart)' },
    'D20': { title: 'D20 (Vimsamsa Chart)' },
    'D24': { title: 'D24 (Chaturvimsamsa Chart)' },
    'D27': { title: 'D27 (Saptavimsamsa Chart)' },
    'D30': { title: 'D30 (Trimsamsa Chart)' }
};

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chartKey } = await req.json();
        if (!chartKey) {
            return NextResponse.json({ error: 'Chart key is required' }, { status: 400 });
        }

        // 1. Fetch the profile and check ownership
        const profile = await prisma.profile.findUnique({
            where: { id, userId: session.user.id }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // 2. Check if already unlocked
        const unlockedCharts = (profile.unlockedCharts as string[]) || [];
        if (unlockedCharts.includes(chartKey)) {
            return NextResponse.json({ success: true, message: 'Chart already unlocked' });
        }

        // 3. Get cost for this specific chart
        const serviceCost = await prisma.serviceCost.findUnique({
            where: { key: `CHART_${chartKey}` }
        });
        const cost = serviceCost?.credits ?? 5; // Default to 5 credits if not set

        // 4. Check user credits (Bypass for Admins)
        const isAdmin = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()).includes(session.user.email?.toLowerCase() || '');

        const allPacks = await prisma.creditPack.findMany({
            where: { userId: session.user.id }
        });
        const totalCredits = allPacks.reduce((acc, p) => acc + (p.questionsTotal - p.questionsUsed), 0);

        if (!isAdmin && totalCredits < cost) {
            return NextResponse.json({
                error: 'Insufficient credits',
                required: cost,
                available: totalCredits
            }, { status: 402 });
        }

        // 5. Deduct credits (Bypass for Admins) and update profile in a transaction
        let creditsToDeduct = isAdmin ? 0 : cost;
        const packsToUpdate = [];
        const sortedPacks = allPacks
            .filter(p => p.questionsTotal > p.questionsUsed)
            .sort((a, b) => new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime());

        for (const pack of sortedPacks) {
            if (creditsToDeduct <= 0) break;
            const available = pack.questionsTotal - pack.questionsUsed;
            const take = Math.min(available, creditsToDeduct);
            packsToUpdate.push({ id: pack.id, increment: take });
            creditsToDeduct -= take;
        }

        await prisma.$transaction([
            ...packsToUpdate.map(p => prisma.creditPack.update({
                where: { id: p.id },
                data: { questionsUsed: { increment: p.increment } }
            })),
            prisma.profile.update({
                where: { id },
                data: {
                    unlockedCharts: [...unlockedCharts, chartKey]
                }
            }),
            prisma.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -(isAdmin ? 0 : cost),
                    description: `Unlocked ${VARGA_DEFINITIONS[chartKey]?.title || chartKey} for ${profile.name}`,
                    metadata: {
                        chartKey,
                        profileId: id,
                        profileName: profile.name,
                        isAdminBypass: isAdmin
                    }
                }
            })
        ]);

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.CREDIT_USED,
            path: `/chart?profile=${id}`,
            userId: session.user.id,
            metadata: {
                feature: 'chart_unlock',
                chartKey,
                creditsUsed: isAdmin ? 0 : cost,
                profileId: id,
                profileName: profile.name,
                isAdminBypass: isAdmin
            }
        });

        if (!isAdmin) {
            const remainingCredits = totalCredits - cost;
            void maybeSendLowCreditLifecycleEmail({
                userId: session.user.id,
                remainingCredits,
                source: 'chart_unlock_low_credit_email',
                returnTo: `/chart?profileId=${id}`,
            }).catch((emailError) => {
                console.error('Low credit lifecycle email failed:', emailError);
            });
        }

        return NextResponse.json({ success: true, unlockedCharts: [...unlockedCharts, chartKey] });

    } catch (error) {
        console.error('Unlock Chart Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
