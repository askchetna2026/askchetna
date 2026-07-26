import { NextResponse } from 'next/server';

/**
 * GET /api/version
 *
 * Returns current app version info
 * Update CURRENT_VERSION in versionManager.ts when deploying changes
 *
 * Response:
 * {
 *   "version": "1.0.1",
 *   "releaseDate": "2026-07-26",
 *   "critical": false,
 *   "changelog": "Bug fixes and performance improvements"
 * }
 */
export async function GET() {
  // This is the current deployed version
  // Increment the version number when pushing significant updates
  const versionInfo = {
    version: '1.0.0',
    releaseDate: new Date().toISOString().split('T')[0],
    critical: false, // Set to true to force update on all users
    changelog:
      'Latest features and improvements from AskChetna',
    minNativeVersion: '1.0.0', // Minimum native app version required
  };

  return NextResponse.json(versionInfo, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
