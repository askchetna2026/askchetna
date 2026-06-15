import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import {
    getLifecycleDashboardData,
    isLifecycleCampaignName,
    runLifecycleCampaignBatch,
} from '@/lib/lifecycleEmails';

export async function GET() {
    try {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await getLifecycleDashboardData();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Admin lifecycle GET error:', error);
        return NextResponse.json({ error: 'Failed to load lifecycle data' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const campaign = isLifecycleCampaignName(body?.campaign) ? body.campaign : 'all';
        const limit = typeof body?.limit === 'number' ? body.limit : undefined;
        const run = await runLifecycleCampaignBatch({
            campaign,
            limit,
            triggerType: 'manual',
        });

        return NextResponse.json({
            success: true,
            ...run,
        });
    } catch (error) {
        console.error('Admin lifecycle POST error:', error);
        return NextResponse.json({ error: 'Failed to run lifecycle campaign' }, { status: 500 });
    }
}
