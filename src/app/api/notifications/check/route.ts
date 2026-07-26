import { NextRequest, NextResponse } from 'next/server';
import { sendUpdateNotificationsIfNeeded } from '@/lib/updates/notificationManager';

/**
 * POST /api/notifications/check
 *
 * Manually trigger version check and send notifications if needed.
 * Can be called by:
 * 1. Vercel deployment webhooks
 * 2. Scheduled GitHub Actions
 * 3. Admin cron jobs
 *
 * Requires CRON_SECRET in Authorization header for security.
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

    const { version, changelog } = await request.json() as {
      version?: string;
      changelog?: string;
    };

    if (!version || !changelog) {
      return NextResponse.json(
        { error: 'Missing version or changelog in request body' },
        { status: 400 }
      );
    }

    // Trigger the notification check
    const sent = await sendUpdateNotificationsIfNeeded(version, changelog);

    return NextResponse.json({
      success: true,
      message: sent ? 'Notifications sent' : 'Version is not new, no notifications sent',
      version,
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
