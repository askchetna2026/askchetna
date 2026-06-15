import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ANALYTICS_EVENTS, isAnalyticsEventType } from '@/lib/analytics/events';
import { getRequestLocation, recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeRunLifecycleAutomation } from '@/lib/lifecycleEmails';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const body = await req.json();
        const { type, path, metadata, visitorId } = body;
        const normalizedType = type === 'PAGE_VIEW' ? ANALYTICS_EVENTS.PAGE_VIEW : type;

        if (!isAnalyticsEventType(normalizedType)) {
            return NextResponse.json({ error: 'Invalid analytics event type' }, { status: 400 });
        }

        const location = getRequestLocation(req.headers);

        await recordAnalyticsEvent({
            type: normalizedType,
            path: typeof path === 'string' ? path : null,
            userId: session?.user?.id || null,
            visitorId: typeof visitorId === 'string' ? visitorId : null,
            country: location.country,
            city: location.city,
            metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
        });

        try {
            await maybeRunLifecycleAutomation('analytics_track');
        } catch (automationError) {
            console.error('Traffic lifecycle automation trigger failed:', automationError);
        }

        return NextResponse.json({ success: true });
    } catch {
        // Don't crash the tracker
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
