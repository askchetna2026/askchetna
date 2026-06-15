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

        const activeProfiles = await prisma.profile.findMany({
            where: {
                userId: session.user.id,
                isActive: true,
            },
            orderBy: { createdAt: 'desc' }, // Most recent first
        });

        // Get user's profile limit
        const limitRecord = await prisma.userProfileLimit.findFirst({
            where: { userId: session.user.id },
            orderBy: { purchasedAt: 'desc' }
        });

        const maxProfiles = parseInt(process.env.MAX_ACTIVE_PROFILES || '5');
        const extraSlots = limitRecord?.extraSlots || 0;
        const totalLimit = maxProfiles + extraSlots;
        const canAddMore = activeProfiles.length < totalLimit;

        // Fetch expansion cost
        const serviceCost = await prisma.serviceCost.findUnique({
            where: { key: 'EXPAND_PROFILE_LIMIT' }
        });
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
