/**
 * Normalises Windows path separators in the iOS Swift Package Manager manifest.
 *
 * `cap sync ios` writes local package paths using the HOST os separator. Run on
 * Windows it emits:
 *
 *   path: "..\..\..\..\node_modules\@capacitor\device"
 *
 * Swift Package Manager on macOS cannot resolve those, so every plugin fails to
 * link and the iOS build dies — with an error that points at SPM rather than at
 * the real cause. Forward slashes work on both platforms.
 *
 * The macOS CI runner regenerates this file correctly during its own `cap sync`,
 * so CI would have self-healed. This exists so the COMMITTED file is also valid,
 * for anyone who opens the project on a Mac without syncing first.
 *
 * Runs automatically after `npm run cap:sync`. Idempotent.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'mobile', 'ios', 'App', 'CapApp-SPM', 'Package.swift');

let manifest;
try {
    manifest = await readFile(manifestPath, 'utf8');
} catch (error) {
    if (error.code === 'ENOENT') {
        // The iOS platform may simply not be added yet.
        console.log('No iOS Package.swift found — skipping.');
        process.exit(0);
    }
    throw error;
}

// Only touch the quoted path: "..." values, so nothing else in the Swift source
// is disturbed by a blind global replace.
let changed = 0;
const fixed = manifest.replace(/path:\s*"([^"]*)"/g, (whole, value) => {
    if (!value.includes('\\')) return whole;
    changed += 1;
    return whole.replace(value, value.replace(/\\/g, '/'));
});

if (changed === 0) {
    console.log('Package.swift paths already use forward slashes — nothing to do.');
    process.exit(0);
}

await writeFile(manifestPath, fixed, 'utf8');
console.log(`Normalised ${changed} Windows path(s) in Package.swift to forward slashes.`);
