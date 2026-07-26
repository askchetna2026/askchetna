/**
 * Version manager for OTA updates.
 *
 * The client version is compared against server version (/api/version).
 * Server version is always read from package.json (single source of truth).
 *
 * When you bump package.json version, the next deployment automatically
 * notifies users with appropriate urgency based on change type (major/minor/patch).
 */

import { useEffect, useState } from 'react';

// Client version - should match package.json
// Update this when you bump package.json version
export const CURRENT_VERSION = '0.2.0';

interface VersionInfo {
  version: string;
  releaseDate: string;
  critical: boolean;
  changelog: string;
  minNativeVersion?: string;
}

export async function checkForUpdates(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const versionInfo: VersionInfo = await response.json();

    // Update available if remote version > current version
    if (compareVersions(versionInfo.version, CURRENT_VERSION) > 0) {
      return versionInfo;
    }

    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Hook to check for updates on app mount
 */
export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      setChecking(true);
      const update = await checkForUpdates();
      setUpdateAvailable(update);
      setChecking(false);

      // Log update check
      if (update) {
        console.log('Update available:', update);
      }
    }

    check();

    // Also check every 2 hours
    const interval = setInterval(check, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    updateAvailable,
    checking,
    dismissed,
    setDismissed,
  };
}
