import { NextRequest, NextResponse } from 'next/server';
import { sendUpdateNotificationsIfNeeded, getNotificationStatus } from '@/lib/updates/notificationManager';
import prisma from '@/lib/prisma';

/**
 * GET /api/notifications/check
 *
 * Debug endpoint - shows current notification status without requiring auth
 */
export async function GET() {
  try {
    const status = getNotificationStatus();

    // Count active device tokens
    const activeDeviceCount = await prisma.deviceToken.count({
      where: { disabledAt: null }
    });

    return NextResponse.json({
      status: 'OK',
      currentVersion: status.currentVersion,
      lastNotifiedVersion: status.lastNotifiedVersion,
      hasChanges: status.hasChanges,
      activeDeviceTokens: activeDeviceCount,
      message: status.hasChanges
        ? 'New version detected - notifications would be sent'
        : 'No new version - no notifications needed'
    });
  } catch (error) {
    console.error('Get notification status failed:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/check
 *
 * Manually trigger version check and send notifications if needed.
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
