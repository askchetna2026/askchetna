/**
 * Read app version from package.json
 * This is the single source of truth for version numbers.
 * Always update package.json when deploying a new version.
 */

import fs from 'fs';
import path from 'path';

let cachedVersion = '';

export function getPackageVersion(): string {
  if (cachedVersion) return cachedVersion;

  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    cachedVersion = packageJson.version || '0.0.0';
    return cachedVersion;
  } catch (error) {
    console.error('Failed to read package.json version:', error);
    return '0.0.0';
  }
}

export type VersionType = 'major' | 'minor' | 'patch' | 'none';

/**
 * Determine what type of version change occurred.
 * Examples:
 * - 1.0.0 -> 2.0.0 = major (critical update)
 * - 1.0.0 -> 1.1.0 = minor (normal update)
 * - 1.0.0 -> 1.0.1 = patch (normal update)
 * - 1.0.0 -> 1.0.0 = none (no change)
 */
export function getVersionChangeType(currentVersion: string, previousVersion: string): VersionType {
  const current = currentVersion.split('.').map(Number);
  const previous = previousVersion.split('.').map(Number);

  const [currMajor = 0, currMinor = 0, currPatch = 0] = current;
  const [prevMajor = 0, prevMinor = 0, prevPatch = 0] = previous;

  if (currMajor > prevMajor) return 'major';
  if (currMinor > prevMinor) return 'minor';
  if (currPatch > prevPatch) return 'patch';
  return 'none';
}

/**
 * Generate appropriate changelog based on version change type.
 * In production, this should read from a CHANGELOG.md or git history.
 */
export function getChangelogForVersion(version: string, changeType: VersionType): string {
  if (changeType === 'major') {
    return `Major update to v${version} - New features and improvements. Update recommended.`;
  }
  if (changeType === 'minor') {
    return `Update to v${version} - New features and bug fixes.`;
  }
  if (changeType === 'patch') {
    return `Patch update to v${version} - Bug fixes and performance improvements.`;
  }
  return `Updated to v${version}.`;
}

/**
 * Determine if update should be marked as critical (forces immediate update).
 * Major version changes are critical; others are optional.
 */
export function isCriticalUpdate(changeType: VersionType): boolean {
  return changeType === 'major';
}
