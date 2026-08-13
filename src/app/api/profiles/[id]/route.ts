import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { prepareChartForStorage } from '@/lib/astrology/chartStorage';

type PatchProfileRequestBody = {
    name?: string;
    gender?: string;
    chartData?: unknown;
};

/**
 * Update an existing profile in place.
 *
 * This route existed with only DELETE, so the one caller that needed to write a
 * recalculated chart back — the varga backfill on the chart page — used
 * `POST /api/profiles`, which unconditionally *creates*. Every visit by a
 * profile whose stored chart predated vargas therefore minted a duplicate
 * profile, and once the user hit their limit it deactivated their oldest one to
 * make room. The local database still shows the wreckage: duplicate
 * (name, dateOfBirth, timeOfBirth) rows, and one account holding seven
 * profiles.
 *
 * Deliberately narrow: it does not accept birth details. Changing those
 * invalidates the chart, and there is exactly one place that knows how to
 * recompute it (BirthDataForm's overwrite flow). A PATCH that let dateOfBirth
 * move without recomputing would leave the two silently disagreeing, which is
 * the harder bug to notice of the two.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (profile.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json() as PatchProfileRequestBody;
        const data: {
            name?: string;
            gender?: string;
            chartData?: ReturnType<typeof prepareChartForStorage>;
        } = {};

        if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
        if (typeof body.gender === 'string' && body.gender) data.gender = body.gender;
        if (body.chartData !== undefined) data.chartData = prepareChartForStorage(body.chartData);

        if (Object.keys(data).length === 0) {
            return NextResponse.json(
                { error: 'No updatable fields supplied (name, gender, chartData)' },
                { status: 400 }
            );
        }

        const updated = await prisma.profile.update({ where: { id }, data });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Find the profile and ensure it belongs to the user
        const profile = await prisma.profile.findUnique({
            where: { id },
            select: { userId: true, isActive: true }
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        if (profile.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        /* REMOVED: Restriction on deleting active profiles as per user request */
        /* if (profile.isActive) {
            return NextResponse.json(
                { error: 'Cannot delete the active profile' },
                { status: 400 }
            );
        } */

        // Delete the profile
        await prisma.profile.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Profile deleted successfully' });
    } catch (error) {
        console.error('Failed to delete profile:', error);
        return NextResponse.json(
            { error: 'Failed to delete profile' },
            { status: 500 }
        );
    }
}
