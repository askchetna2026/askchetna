#!/usr/bin/env node
/**
 * Prints what a version bump actually means, immediately after it happens.
 *
 * package.json is the single source for three surfaces, but each derives its
 * number differently and only one of them fails loudly when it is wrong:
 *   - web                 next.config.ts inlines NEXT_PUBLIC_APP_VERSION
 *   - Android             build.gradle computes versionName and versionCode
 *   - iOS                 ios-release.yml runs agvtool new-marketing-version
 *
 * The number also has a behavioural consequence that is easy to trigger by
 * accident: isCriticalUpdate() in src/lib/updates/versionManager.ts treats ANY
 * major jump as unskippable, so 2.x -> 3.0.0 force-reloads every open app
 * rather than offering a dismissible prompt. Worth seeing that stated at the
 * moment you choose it, not after the deploy.
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = pkg.version;
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;

/** Whatever is currently deployed, so the jump can be characterised. */
let previous = null;
try {
    previous = JSON.parse(
        execSync('git show HEAD:package.json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    ).version;
} catch {
    // No git, or no committed package.json yet — the comparison is a nicety.
}

let jump = 'unknown';
if (previous) {
    const [pMajor, pMinor] = previous.split('.').map(Number);
    if (major > pMajor) jump = 'MAJOR';
    else if (minor > pMinor) jump = 'minor';
    else jump = 'patch';
}

const line = '─'.repeat(58);
console.log(`\n${line}`);
console.log(`  ${previous ? `${previous}  →  ` : ''}${version}${jump !== 'unknown' ? `   (${jump})` : ''}`);
console.log(line);
console.log(`  web       NEXT_PUBLIC_APP_VERSION = ${version}`);
console.log(`  android   versionName ${version} · versionCode ${versionCode}`);
console.log(`  ios       MARKETING_VERSION ${version} (set by CI from this file)`);

if (jump === 'MAJOR') {
    console.log(`\n  ⚠  A major jump is treated as a CRITICAL update.`);
    console.log(`     Every user with the app open is force-reloaded rather than`);
    console.log(`     shown a dismissible prompt. See isCriticalUpdate() in`);
    console.log(`     src/lib/updates/versionManager.ts.`);
}

console.log(`\n  Next:  git add package.json package-lock.json`);
console.log(`         git commit -m "chore: release ${version}"\n`);
