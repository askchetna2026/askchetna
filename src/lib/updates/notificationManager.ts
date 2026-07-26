/**
 * Manages automatic update notifications.
 *
 * Reads version from package.json (single source of truth).
 * Detects new deployments by comparing with in-memory cache.
 * Automatically sends notifications with no manual env var updates.
 *
 * Flow:
 * 1. Code pushed to preview → Vercel rebuilds
 * 2. package.json version is now different from what was deployed before
 * 3. First request to /api/version detects change
 * 4. System auto-sends push notifications
 * 5. In-memory cache prevents duplicate notifications on same server instance
 * 6. Next deployment (new version in package.json) triggers again
 */

import { sendPushToUsers } from '@/lib/push/send';
import prisma from '@/lib/prisma';
import {
  getPackageVersion,
  getVersionChangeType,
  getChangelogForVersion,
  isCriticalUpdate,
} from '@/lib/updates/packageVersion';

// In-memory cache: tracks last version we notified about on this server instance
// Resets on deployment (server restart), allowing re-notification after new deploy
let lastNotifiedVersion = '';

/**
 * Initialize the cache with current version.
 * This prevents notifications on startup if version hasn't changed.
 */
export function initializeNotificationCache(): void {
  if (!lastNotifiedVersion) {
    lastNotifiedVersion = getPackageVersion();
  }
}

/**
 * Automatically send update notifications if version changed.
 * Call this from the /api/version endpoint on every request.
 *
 * Returns true if notifications were sent, false otherwise.
 */
export async function sendUpdateNotificationsIfNeeded(): Promise<boolean> {
  try {
    // Initialize cache on first call
    if (!lastNotifiedVersion) {
      initializeNotificationCache();
    }

    const currentVersion = getPackageVersion();
    const changeType = getVersionChangeType(currentVersion, lastNotifiedVersion);

    // No version change detected
    if (changeType === 'none') {
      return false;
    }

    console.log(
      `[updates] ${changeType.toUpperCase()} version change detected: ${lastNotifiedVersion} -> ${currentVersion}`
    );

    const changelog = getChangelogForVersion(currentVersion, changeType);
    const isCritical = isCriticalUpdate(changeType);

    // Get all users with active devices
    const activeDevices = await prisma.deviceToken.findMany({
      where: { disabledAt: null },
      select: { userId: true },
      distinct: ['userId'],
    });

    const userIds = [...new Set(activeDevices.map((d) => d.userId))];

    if (userIds.length === 0) {
      console.log('[updates] No active users to notify');
      lastNotifiedVersion = currentVersion;
      return false;
    }

    // Send notifications
    const result = await sendPushToUsers(userIds, {
      title: isCritical ? '⚠️ Critical App Update' : '✨ App Update Available',
      body: changelog,
      path: '/app-info',
      data: {
        version: currentVersion,
        type: 'update',
        critical: isCritical ? 'true' : 'false',
      },
    });

    console.log(
      `[updates] ${changeType} update notifications sent: ${result.sent}/${userIds.length} (critical: ${isCritical})`
    );

    // Update cache so we don't re-notify on next request (same server instance)
    lastNotifiedVersion = currentVersion;
    return result.sent > 0;
  } catch (error) {
    console.error('[updates] Failed to send auto notifications:', error);
    return false;
  }
}

/**
 * Get current status for debugging.
 */
export function getNotificationStatus(): {
  currentVersion: string;
  lastNotifiedVersion: string;
  hasChanges: boolean;
} {
  const currentVersion = getPackageVersion();
  const changeType = getVersionChangeType(currentVersion, lastNotifiedVersion);

  return {
    currentVersion,
    lastNotifiedVersion,
    hasChanges: changeType !== 'none',
  };
}
