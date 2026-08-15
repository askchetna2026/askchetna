import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { prepareChartForStorage } from '@/lib/astrology/chartStorage';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the user's single profile
        const profile = await prisma.profile.findFirst({
            where: {
                userId: session.user.id,
                isActive: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error('Profile GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // requireUser, not auth(): this handler inserts a row with a userId
        // foreign key, and a JWT can outlive the user it names. Without the
        // existence check that surfaces as "Foreign key constraint violated"
        // — a 500 whose message says nothing about the one fix, signing in
        // again. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        const body = await req.json();
        const { name, dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude, gender, chartData } = body;

        if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth || !gender || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Upsert: Update if exists, Create if not. 
        // We use findFirst to check existence because userId isn't unique in schema (though we enforce 1:1 logic here)
        // Actually, to use 'upsert', we need a unique identifier. 
        // Since schema is: model Profile { ... userId String ... }, let's check first.

        const existingProfile = await prisma.profile.findFirst({
            where: {
                userId: session.user.id,
                isActive: true
            }
        });

        let profile;
        if (existingProfile) {
            // Update
            profile = await prisma.profile.update({
                where: { id: existingProfile.id },
                data: {
                    name,
                    dateOfBirth: new Date(dateOfBirth),
                    timeOfBirth,
                    placeOfBirth,
                    latitude,
                    longitude,
                    gender,
                    timezone: 'IST', // Assuming IST for now given Indian Cities focus, or calculate later
                    // Runs over the retained chart too, not just an incoming
                    // one, so a profile saved through here sheds any legacy
                    // `transits`/deep-dasha bloat it was still carrying.
                    chartData: prepareChartForStorage(chartData || existingProfile.chartData)
                } as any
            });
        } else {
            // Create
            profile = await prisma.profile.create({
                data: {
                    userId: session.user.id,
                    name,
                    dateOfBirth: new Date(dateOfBirth),
                    timeOfBirth,
                    placeOfBirth,
                    latitude,
                    longitude,
                    gender,
                    timezone: 'IST',
                    chartData: prepareChartForStorage(chartData)
                } as any
            });
        }

        return NextResponse.json(profile);

    } catch (error) {
        console.error('Profile POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
