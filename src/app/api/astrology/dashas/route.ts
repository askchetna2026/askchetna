import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { calculateChart, calculateVimsottariDashas } from '@/lib/astrology/calculator';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const profileId = searchParams.get('profileId');

        let birthData;

        if (profileId) {
            const profile = await prisma.profile.findFirst({
                where: {
                    id: profileId,
                    userId: session.user.id
                }
            });
            if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

            birthData = {
                year: profile.dateOfBirth.getUTCFullYear(),
                month: profile.dateOfBirth.getUTCMonth() + 1,
                day: profile.dateOfBirth.getUTCDate(),
                hour: 12, // Default if not specified, or parse from timeOfBirth
                minute: 0,
                lat: profile.latitude,
                lng: profile.longitude,
                dob: profile.dateOfBirth
            };

            if (profile.timeOfBirth) {
                const [h, m] = profile.timeOfBirth.split(':').map(Number);
                birthData.hour = h;
                birthData.minute = m;
            }
        } else {
            // Check for raw query params as fallback
            const year = searchParams.get('year');
            const month = searchParams.get('month');
            const day = searchParams.get('day');
            const lat = searchParams.get('lat');
            const lng = searchParams.get('lng');
            const hour = searchParams.get('hour') || '12';
            const minute = searchParams.get('minute') || '0';

            if (!year || !month || !day || !lat || !lng) {
                return NextResponse.json({ error: 'Missing birth details' }, { status: 400 });
            }

            birthData = {
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day),
                hour: parseInt(hour),
                minute: parseInt(minute),
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                dob: new Date(`${year}-${month}-${day}`)
            };
        }

        const decimalHour = birthData.hour + (birthData.minute / 60);
        const chart = await calculateChart(
            birthData.year,
            birthData.month,
            birthData.day,
            decimalHour,
            birthData.lat,
            birthData.lng
        );

        const dashas = calculateVimsottariDashas(chart.planets['Moon'].longitude, birthData.dob);

        return NextResponse.json({
            dashas,
            moonSign: chart.planets['Moon'].longitude,
            ascendant: chart.ascendant
        });

    } catch (error) {
        console.error('Dasha calculation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
