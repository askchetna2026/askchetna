/**
 * Version manager for OTA updates.
 *
 * The client fetches current version from /api/version on each check.
 * Server version is always read from package.json (single source of truth).
 *
 * When you bump package.json version, the next deployment automatically
 * notifies users.
 *
 * This approach ensures:
 * 1. Client always has latest version after code update (reload)
 * 2. Version mismatch is detected correctly
 * 3. No manual version syncing needed
 */

import { useEffect, useState } from 'react';

// Fallback version if API is unreachable
export const CURRENT_VERSION = '0.0.0';

interface VersionInfo {
  version: string;
  releaseDate: string;
  critical: boolean;
  changelog: string;
  minNativeVersion?: string;
}

// Track the current deployed version by checking API on startup
let deployedVersion = '';

async function getDeployedVersion(): Promise<string> {
  if (deployedVersion) return deployedVersion;

  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data: VersionInfo = await response.json();
      deployedVersion = data.version;
      return data.version;
    }
  } catch (error) {
    console.error('Failed to fetch deployed version:', error);
  }
  return CURRENT_VERSION;
}

export async function checkForUpdates(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const versionInfo: VersionInfo = await response.json();

    // Get current deployed version
    const currentDeployed = await getDeployedVersion();

    // Update available if remote version > deployed version
    if (compareVersions(versionInfo.version, currentDeployed) > 0) {
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
