/**
 * Staleness detection for the native apps.
 *
 * The apps bundle no web content — capacitor.config.ts points the WebView at the
 * live site — so a cold start always loads the newest deployment and there is
 * nothing to "install". The only way a user runs old code is by holding a
 * session open across a deploy, which a reload fixes.
 *
 * CURRENT_VERSION is inlined at build time (next.config.ts) so it describes the
 * bundle actually executing. Reading it at runtime would compare the server to
 * itself and report an update that reloading could never clear.
 */

import { useEffect, useState } from 'react';

export const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

export interface VersionInfo {
  version: string;
  releaseDate: string;
  critical: boolean;
  changelog: string;
  minNativeVersion?: string;
}

/**
 * Records the version an automatic reload was already attempted for.
 *
 * Session-scoped, and the guard against a bricked app: if the two versions ever
 * fail to converge — a bad deploy, an unreadable package.json resolving to
 * 0.0.0, two Vercel instances disagreeing — an unguarded auto-reload would spin
 * forever and the app would never reach usable content.
 */
const RELOAD_GUARD_KEY = 'update_autoreload_attempted_for';

export async function fetchServerVersion(): Promise<VersionInfo | null> {
  try {
    // cache: 'no-store' matters. The endpoint sets max-age=3600, so a cached
    // response would keep reporting the pre-deploy version for an hour.
    const response = await fetch('/api/version', { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[updates] version fetch failed:', error);
    return null;
  }
}

/** Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((v) => parseInt(v, 10) || 0);
  const pb = b.split('.').map((v) => parseInt(v, 10) || 0);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export type VersionChange = 'major' | 'minor' | 'patch' | 'none';

/**
 * How big a jump it is from `from` to `to`.
 *
 * Worked out on the client rather than the server, because the client is the
 * only side that knows both numbers: its own is compiled in, the other arrives
 * from /api/version. Asking the server would mean it remembering which version
 * each caller last ran, which is state it has no good place to keep.
 */
export function getVersionChange(from: string, to: string): VersionChange {
  const [fMajor = 0, fMinor = 0, fPatch = 0] = from.split('.').map((v) => parseInt(v, 10) || 0);
  const [tMajor = 0, tMinor = 0, tPatch = 0] = to.split('.').map((v) => parseInt(v, 10) || 0);

  if (tMajor > fMajor) return 'major';
  if (tMajor === fMajor && tMinor > fMinor) return 'minor';
  if (tMajor === fMajor && tMinor === fMinor && tPatch > fPatch) return 'patch';
  return 'none';
}

/**
 * Whether an update should be treated as unskippable.
 *
 * A major bump means the deployment may no longer honour what this bundle
 * expects of it, so leaving the user on old code risks quiet breakage rather
 * than mere staleness. The server can also force it explicitly.
 */
export function isCriticalUpdate(update: VersionInfo): boolean {
  return update.critical || getVersionChange(CURRENT_VERSION, update.version) === 'major';
}

/**
 * Resolves to the deployed version when this page is running older code.
 */
export async function checkForUpdates(): Promise<VersionInfo | null> {
  const server = await fetchServerVersion();
  if (!server) return null;

  return compareVersions(server.version, CURRENT_VERSION) > 0 ? server : null;
}

/** True when an automatic reload for this version has not been tried yet. */
export function canAutoReload(targetVersion: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(RELOAD_GUARD_KEY) !== targetVersion;
  } catch {
    // Storage unavailable means the guard can't hold, so don't auto-reload.
    return false;
  }
}

export function markAutoReloadAttempted(targetVersion: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, targetVersion);
  } catch {
    /* nothing to do — canAutoReload already fails closed */
  }
}

export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const update = await checkForUpdates();
      if (cancelled) return;
      setUpdateAvailable(update);
      setChecking(false);
    }

    void check();

    // Catches a deploy that lands while the app sits open.
    const interval = setInterval(() => void check(), 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { updateAvailable, checking, dismissed, setDismissed };
}
