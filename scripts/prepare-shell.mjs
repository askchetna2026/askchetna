/**
 * Points mobile/shell/offline.html at the same deployment as CAP_SERVER_URL.
 *
 * offline.html is the launch-time offline fallback (Capacitor's
 * `server.errorPath`). Its "Try Again" button needs an ABSOLUTE url, because the
 * page is served from the local bundle and so has no useful origin of its own.
 *
 * Without this, a preview build's offline page would send the tester to
 * production the moment connectivity returned — quietly testing the wrong
 * deployment.
 *
 * Run before `cap sync`. Idempotent, and a no-op when the url already matches.
 *
 *   CAP_SERVER_URL=https://preview.askchetna.com node scripts/prepare-shell.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shellPath = join(root, 'mobile', 'shell', 'offline.html');

// Must stay in sync with the default in capacitor.config.ts.
const serverUrl = (process.env.CAP_SERVER_URL || 'https://www.askchetna.com').replace(/\/+$/, '');

try {
    new URL(serverUrl);
} catch {
    console.error(`CAP_SERVER_URL is not a valid absolute URL: ${serverUrl}`);
    process.exit(1);
}

const html = await readFile(shellPath, 'utf8');

// Matches the `var SITE = '...';` line in offline.html.
const pattern = /(var SITE = ')([^']*)(';)/;
const match = html.match(pattern);

if (!match) {
    console.error(
        `Could not find the SITE declaration in ${shellPath}.\n` +
        `Expected a line of the form:  var SITE = 'https://...';`
    );
    process.exit(1);
}

if (match[2] === serverUrl) {
    console.log(`offline.html already targets ${serverUrl} — nothing to do.`);
    process.exit(0);
}

await writeFile(shellPath, html.replace(pattern, `$1${serverUrl}$3`), 'utf8');
console.log(`offline.html retry target: ${match[2]} -> ${serverUrl}`);
