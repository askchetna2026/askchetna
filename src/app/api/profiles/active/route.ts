import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Three independent reads. They used to be awaited one after another,
        // which on a pooled connection is three full round trips for a route
        // that every screen in the app calls — ~1.5s in the dev log, all of it
        // latency rather than work. Nothing here depends on anything else here.
        const [activeProfiles, limitRecord, serviceCost] = await Promise.all([
            prisma.profile.findMany({
                where: {
                    userId: session.user.id,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' }, // Most recent first
                // Explicit, because Profile is read on nearly every navigation:
                // a column added ahead of its migration would otherwise P2022
                // the whole app rather than one screen. `timezone` is left out —
                // it is stored at creation and no client reads it.
                select: {
                    id: true,
                    userId: true,
                    name: true,
                    dateOfBirth: true,
                    timeOfBirth: true,
                    placeOfBirth: true,
                    latitude: true,
                    longitude: true,
                    gender: true,
                    chartData: true,
                    isActive: true,
                    unlockedCharts: true,
                    disabledAt: true,
                    disabledReason: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.userProfileLimit.findFirst({
                where: { userId: session.user.id },
                orderBy: { purchasedAt: 'desc' },
                select: { extraSlots: true },
            }),
            prisma.serviceCost.findUnique({
                where: { key: 'EXPAND_PROFILE_LIMIT' },
                select: { credits: true },
            }),
        ]);

        const maxProfiles = parseInt(process.env.MAX_ACTIVE_PROFILES || '5');
        const extraSlots = limitRecord?.extraSlots || 0;
        const totalLimit = maxProfiles + extraSlots;
        const canAddMore = activeProfiles.length < totalLimit;
        const expansionCost = serviceCost?.credits || 50;

        return NextResponse.json({
            profiles: activeProfiles,
            limit: totalLimit,
            baseLimit: maxProfiles,
            extraSlots,
            canAddMore,
            expandable: totalLimit < 10,
            expansionCost,
        });
    } catch (error) {
        console.error('Failed to fetch active profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch active profile' },
            { status: 500 }
        );
    }
}
