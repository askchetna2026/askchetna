/**
 * Manages automatic update notifications.
 *
 * Tracks which version users have been notified about and automatically
 * sends notifications when a new version is deployed.
 */

import { sendPushToUsers } from '@/lib/push/send';
import prisma from '@/lib/prisma';

const LAST_NOTIFIED_VERSION_KEY = 'UPDATE_NOTIFICATION_LAST_VERSION';

/**
 * Get the last version we sent notifications for.
 * Uses an env variable for simplicity (set on deployment).
 */
function getLastNotifiedVersion(): string {
  return process.env[LAST_NOTIFIED_VERSION_KEY] || '0.0.0';
}

/**
 * Check if current version is newer than last notified version.
 */
export function isNewVersionAvailable(currentVersion: string, lastNotified: string): boolean {
  const current = currentVersion.split('.').map(Number);
  const last = lastNotified.split('.').map(Number);

  for (let i = 0; i < Math.max(current.length, last.length); i++) {
    const c = current[i] || 0;
    const l = last[i] || 0;
    if (c > l) return true;
    if (c < l) return false;
  }

  return false;
}

/**
 * Automatically send update notifications if there's a new version.
 * Call this from:
 * 1. The /api/version endpoint (on every request)
 * 2. A Vercel deployment webhook
 * 3. A scheduled cron job
 *
 * Returns true if notifications were sent, false otherwise.
 */
export async function sendUpdateNotificationsIfNeeded(
  currentVersion: string,
  changelog: string
): Promise<boolean> {
  try {
    const lastNotified = getLastNotifiedVersion();

    // Check if we have a new version
    if (!isNewVersionAvailable(currentVersion, lastNotified)) {
      console.log(
        `[updates] Version ${currentVersion} is not newer than last notified ${lastNotified}`
      );
      return false;
    }

    console.log(
      `[updates] New version detected: ${lastNotified} -> ${currentVersion}. Sending notifications...`
    );

    // Get all users with active devices
    const activeDevices = await prisma.deviceToken.findMany({
      where: { disabledAt: null },
      select: { userId: true },
      distinct: ['userId'],
    });

    const userIds = [...new Set(activeDevices.map((d) => d.userId))];

    if (userIds.length === 0) {
      console.log('[updates] No active users to notify');
      return false;
    }

    // Send notifications
    const result = await sendPushToUsers(userIds, {
      title: '✨ App Update Available',
      body: changelog,
      path: '/app-info',
      data: {
        version: currentVersion,
        type: 'update',
      },
    });

    console.log(`[updates] Notifications sent: ${result.sent}/${userIds.length}`);
    return result.sent > 0;
  } catch (error) {
    console.error('[updates] Failed to send auto notifications:', error);
    return false;
  }
}

/**
 * Format instructions for environment setup.
 * After deploying a new version, update this env var so the system knows
 * which version was last notified about.
 */
export function getDeploymentInstructions(newVersion: string): string {
  return `
After deployment to preview:

1. Update Vercel environment variable on ${process.env.VERCEL_ENV || 'preview'} environment:
   Name: UPDATE_NOTIFICATION_LAST_VERSION
   Value: ${newVersion}

   OR add to .env.preview:
   UPDATE_NOTIFICATION_LAST_VERSION=${newVersion}

2. Trigger redeployment OR manually call:
   curl -X POST https://preview.askchetna.com/api/notifications/check \
     -H "Authorization: Bearer \$CRON_SECRET"

This notifies all users with active devices about the new version.
  `;
}
