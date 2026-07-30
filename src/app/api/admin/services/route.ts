
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { DEFAULT_WELCOME_BONUS_CREDITS } from '@/lib/welcomeBonus';

export async function GET(req: NextRequest) {
    if (!await checkAdminAccess()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Auto-seed missing services
        const KNOWN_SERVICES = [
            'CHART_D2', 'CHART_D3', 'CHART_D4', 'CHART_D5', 'CHART_D6',
            'CHART_D7', 'CHART_D8', 'CHART_D10', 'CHART_D12', 'CHART_D16',
            'CHART_D20', 'CHART_D24', 'CHART_D27', 'CHART_D30',
            'EXPAND_PROFILE_LIMIT', 'WELCOME_BONUS'
        ];

        for (const key of KNOWN_SERVICES) {
            await prisma.serviceCost.upsert({
                where: { key },
                update: {},
                create: {
                    key,
                    credits: key === 'WELCOME_BONUS' ? DEFAULT_WELCOME_BONUS_CREDITS : 5,
                    description: key === 'WELCOME_BONUS' ? 'Credits given on sign-up' : `Unlock ${key} Analysis`
                }
            });
        }

        const services = await prisma.serviceCost.findMany({
            orderBy: { key: 'asc' }
        });
        return NextResponse.json(services);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    if (!await checkAdminAccess()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { key, credits } = await req.json();

        const service = await prisma.serviceCost.update({
            where: { key },
            data: { credits: parseInt(credits) }
        });

        return NextResponse.json(service);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update service cost' }, { status: 500 });
    }
}
