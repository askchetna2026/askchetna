/**
 * Version manager for OTA updates.
 *
 * Automatic update detection:
 * 1. On app startup, fetch /api/version from server
 * 2. Compare against last known version (stored in localStorage)
 * 3. If different, show update notification automatically
 * 4. User taps "Update Now" -> page reloads -> gets new code
 * 5. New code fetches API again, sees it's the latest, hides notification
 *
 * Simple, automatic, no manual steps needed.
 */

import { useEffect, useState } from 'react';

export const CURRENT_VERSION = '0.0.0'; // Fallback if API unreachable

interface VersionInfo {
  version: string;
  releaseDate: string;
  critical: boolean;
  changelog: string;
  minNativeVersion?: string;
}

const STORAGE_KEY = 'last_known_app_version';

/**
 * Get the version from API
 */
export async function fetchServerVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch server version:', error);
    return null;
  }
}

/**
 * Get the last known version stored locally
 */
function getLastKnownVersion(): string {
  if (typeof window === 'undefined') return CURRENT_VERSION;
  try {
    return localStorage.getItem(STORAGE_KEY) || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Store the current version as the "last known"
 */
function storeLastKnownVersion(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // Silent fail - localStorage might not be available
  }
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((v) => parseInt(v, 10) || 0);
  const parts2 = v2.split('.').map((v) => parseInt(v, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Check for updates by comparing server version against last known version
 */
export async function checkForUpdates(): Promise<VersionInfo | null> {
  const serverVersion = await fetchServerVersion();
  if (!serverVersion) return null;

  const lastKnown = getLastKnownVersion();

  // New version available if server > last known
  if (compareVersions(serverVersion.version, lastKnown) > 0) {
    console.log(`[updates] New version detected: ${lastKnown} -> ${serverVersion.version}`);
    return serverVersion;
  }

  // If we just got a version, store it so next check knows we're on this version
  storeLastKnownVersion(serverVersion.version);
  return null;
}

/**
 * Hook to check for updates on app mount (AUTOMATIC)
 * No manual interaction needed - just checks on startup
 */
export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      setChecking(true);
      try {
        const update = await checkForUpdates();
        setUpdateAvailable(update);

        if (update) {
          console.log('Update available:', update);
        }
      } finally {
        setChecking(false);
      }
    }

    // Check on mount (automatic, no user action needed)
    check();

    // Also check every 30 minutes
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    updateAvailable,
    checking,
    dismissed,
    setDismissed,
  };
}
