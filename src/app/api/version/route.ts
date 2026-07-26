import { NextResponse } from 'next/server';
import { sendUpdateNotificationsIfNeeded } from '@/lib/updates/notificationManager';
import { getPackageVersion } from '@/lib/updates/packageVersion';

/**
 * GET /api/version
 *
 * Returns current app version info from package.json.
 * Automatically sends push notifications if version changed from last deployment.
 *
 * Deployment flow (fully automated, zero manual steps):
 * 1. Update package.json version before pushing to preview
 * 2. Code pushed to preview → Vercel auto-deploys
 * 3. First request to /api/version detects version change
 * 4. System auto-sends push notifications to all active users
 * 5. Users see update banner with appropriate urgency
 *    - Major version = critical (red banner, forces update)
 *    - Minor/patch = normal (blue banner, can dismiss for 24h)
 *
 * Response:
 * {
 *   "version": "0.2.0",
 *   "releaseDate": "2026-07-26",
 *   "critical": false,
 *   "changelog": "..."
 * }
 */
export async function GET() {
  const version = getPackageVersion();
  const versionInfo = {
    version,
    releaseDate: new Date().toISOString().split('T')[0],
    critical: false, // Set in notificationManager based on version change type
    changelog: 'Check app info for update details',
    minNativeVersion: '1.0.0',
  };

  // Auto-detect version change and send notifications if needed
  // This runs on first request after Vercel deployment
  try {
    await sendUpdateNotificationsIfNeeded();
  } catch (error) {
    console.error('[api/version] Auto-notification failed (non-fatal):', error);
    // Don't fail the response; version endpoint is critical
  }

  return NextResponse.json(versionInfo, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
