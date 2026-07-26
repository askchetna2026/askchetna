/**
 * The deployed version, read from package.json — the single source of truth.
 *
 * Server-only: this touches the filesystem, so it must never be pulled into a
 * client bundle. The browser gets the same number a different way, inlined at
 * build time as NEXT_PUBLIC_APP_VERSION (see next.config.ts), which is what lets
 * a loaded page report which deployment it came from.
 */

import fs from 'fs';
import path from 'path';

// Safe to cache for the life of the process: a new deployment means new
// instances, which re-read the file.
let cachedVersion = '';

export function getPackageVersion(): string {
    if (cachedVersion) return cachedVersion;

    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        cachedVersion = packageJson.version || '0.0.0';
        return cachedVersion;
    } catch (error) {
        console.error('[updates] could not read package.json version:', error);
        return '0.0.0';
    }
}
