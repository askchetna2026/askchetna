import { NextRequest, NextResponse, after } from 'next/server';
import { auth } from '@/auth';
import { ANALYTICS_EVENTS, isAnalyticsEventType } from '@/lib/analytics/events';
import { getRequestLocation, recordAnalyticsEvent } from '@/lib/analytics/server';
import { maybeRunLifecycleAutomation } from '@/lib/lifecycleEmails';
import { maybePurgeDueAccounts } from '@/lib/accountDeletion';

/**
 * The page-view tracker.
 *
 * Nothing here is on the seeker's critical path, but until now all of it was
 * awaited before the response returned: an AnalyticsEvent insert, and then the
 * entire lifecycle-email engine — two SERIALIZABLE transactions, and on a window
 * boundary the campaign run itself, joining Question against User and sending
 * mail. This fires from an effect on every single page view, so every navigation
 * in the app paid for it. It showed up in the dev log as 2-5s of `POST
 * /api/analytics/track`, and as P2034 write conflicts whenever two views landed
 * together.
 *
 * `after` hands the work to the platform's waitUntil, so the browser's request
 * settles immediately and the work still runs to completion — unlike a floating
 * promise, which a serverless runtime is free to kill the moment the response
 * is sent.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const body = await req.json();
        const { type, path, metadata, visitorId } = body;
        const normalizedType = type === 'PAGE_VIEW' ? ANALYTICS_EVENTS.PAGE_VIEW : type;

        if (!isAnalyticsEventType(normalizedType)) {
            return NextResponse.json({ error: 'Invalid analytics event type' }, { status: 400 });
        }

        // Read from the request before handing off — `after` runs once the
        // request is gone.
        const location = getRequestLocation(req.headers);
        const event = {
            type: normalizedType,
            path: typeof path === 'string' ? path : null,
            userId: session?.user?.id || null,
            visitorId: typeof visitorId === 'string' ? visitorId : null,
            country: location.country,
            city: location.city,
            metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
        };

        after(async () => {
            try {
                await recordAnalyticsEvent(event);
            } catch (error) {
                console.error('Analytics event insert failed:', error);
            }

            try {
                await maybeRunLifecycleAutomation('analytics_track');
            } catch (error) {
                console.error('Traffic lifecycle automation trigger failed:', error);
            }

            // Deleting an account is a promise with a date on it, and the cron
            // that used to keep it has not existed since `392c147`. Traffic is
            // the trigger because the person who asked to be deleted is exactly
            // the one who never returns to trigger anything themselves.
            // Throttled to once an hour deployment-wide; see the comments there.
            try {
                await maybePurgeDueAccounts();
            } catch (error) {
                console.error('Traffic account purge trigger failed:', error);
            }
        });

        return NextResponse.json({ success: true });
    } catch {
        // Don't crash the tracker
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
