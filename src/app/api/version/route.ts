import { NextResponse } from 'next/server';
import { sendUpdateNotificationsIfNeeded } from '@/lib/updates/notificationManager';

/**
 * GET /api/version
 *
 * Returns current app version info and auto-sends notifications if version changed.
 *
 * Deployment flow:
 * 1. Code pushed to preview → Vercel auto-deploys
 * 2. Next request to /api/version detects new version
 * 3. System auto-sends push notifications to all users
 * 4. Update environment variable so we don't re-notify on next request
 *
 * Response:
 * {
 *   "version": "1.0.2",
 *   "releaseDate": "2026-07-26",
 *   "critical": false,
 *   "changelog": "New features and bug fixes"
 * }
 */
export async function GET() {
  const versionInfo = {
    version: '1.0.2',
    releaseDate: new Date().toISOString().split('T')[0],
    critical: false, // Set to true to force update on all users
    changelog: 'Performance improvements and new features',
    minNativeVersion: '1.0.0', // Minimum native app version required
  };

  // Try to send notifications if this is a new version
  // This happens automatically on first request after Vercel deployment
  try {
    await sendUpdateNotificationsIfNeeded(versionInfo.version, versionInfo.changelog);
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
