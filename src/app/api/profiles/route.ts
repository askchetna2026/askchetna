import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type CreateProfileRequestBody = {
    name?: string;
    dateOfBirth?: string;
    timeOfBirth?: string;
    placeOfBirth?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    gender?: string;
    chartData?: Prisma.InputJsonValue;
};

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const profiles = await prisma.profile.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(profiles);
    } catch (error) {
        console.error('Failed to fetch profiles:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profiles' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json() as CreateProfileRequestBody;
        const { name, dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude, timezone, gender, chartData } = body;

        const hasCoordinates =
            typeof latitude === 'number' &&
            Number.isFinite(latitude) &&
            typeof longitude === 'number' &&
            Number.isFinite(longitude);

        if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth || !gender || !hasCoordinates) {
            return NextResponse.json(
                { error: 'Missing required fields (name, dob, time, pob, latitude, longitude, gender)' },
                { status: 400 }
            );
        }

        // Get current active profiles
        const activeProfiles = await prisma.profile.findMany({
            where: {
                userId: session.user.id,
                isActive: true,
            },
            orderBy: { createdAt: 'asc' }, // Oldest first
        });

        const limitRecord = await prisma.userProfileLimit.findFirst({
            where: { userId: session.user.id },
            orderBy: { purchasedAt: 'desc' }
        });
        const maxActiveProfiles = parseInt(process.env.MAX_ACTIVE_PROFILES || '5');
        const extraSlots = limitRecord?.extraSlots || 0;
        const totalLimit = Math.min(maxActiveProfiles + extraSlots, 10);

        // If at or over limit, deactivate the oldest profile(s)
        if (activeProfiles.length >= totalLimit) {
            const profilesToDeactivate = activeProfiles.slice(0, activeProfiles.length - totalLimit + 1);

            for (const profile of profilesToDeactivate) {
                await prisma.profile.update({
                    where: { id: profile.id },
                    data: {
                        isActive: false,
                        disabledAt: new Date(),
                        disabledReason: `Exceeded max active profiles limit (${totalLimit})`,
                    },
                });
            }
        }

        const profile = await prisma.profile.create({
            data: {
                userId: session.user.id,
                name,
                dateOfBirth: new Date(dateOfBirth),
                timeOfBirth,
                placeOfBirth,
                latitude,
                longitude,
                timezone: timezone || 'UTC',
                gender,
                chartData: chartData ?? {},
                isActive: true,
            },
        });

        return NextResponse.json(profile, { status: 201 });
    } catch (error) {
        console.error('Failed to create profile:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
        );
    }
}
