import { NextRequest, NextResponse } from 'next/server';
import { sendUpdateNotificationsIfNeeded, getNotificationStatus } from '@/lib/updates/notificationManager';

/**
 * POST /api/notifications/check
 *
 * Manually trigger version check and send notifications if needed.
 * Useful for testing or when you want to force a check outside of /api/version requests.
 *
 * Requires CRON_SECRET in Authorization header for security.
 * No request body needed - reads version from package.json automatically.
 */

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== cronSecret) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 403 }
      );
    }

    // Trigger the notification check (reads version from package.json)
    const sent = await sendUpdateNotificationsIfNeeded();
    const status = getNotificationStatus();

    return NextResponse.json({
      success: true,
      message: sent ? 'Notifications sent' : 'No new version, notifications not needed',
      ...status,
      notificationsSent: sent,
    });
  } catch (error) {
    console.error('Check notifications failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
