import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push/send';

/**
 * POST /api/notifications/send-update
 *
 * Admin-only endpoint to broadcast update notifications to all active users.
 *
 * Requires CRON_SECRET in Authorization header.
 * Typically called when a new app version is deployed.
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
        { error: 'Missing version or changelog' },
        { status: 400 }
      );
    }

    // Get all users with active device tokens
    const activeDevices = await prisma.deviceToken.findMany({
      where: {
        disabledAt: null,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    const userIds = [...new Set(activeDevices.map((d) => d.userId))];

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users to notify',
        sent: 0,
      });
    }

    const result = await sendPushToUsers(
      userIds,
      {
        title: '✨ App Update Available',
        body: changelog,
        path: '/app-info',
        data: {
          version,
          type: 'update',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Update notification sent`,
      version,
      recipients: userIds.length,
      sent: result.sent,
      failed: result.failed,
      disabled: result.disabled,
    });
  } catch (error) {
    console.error('Send update notification failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
