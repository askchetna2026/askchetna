/**
 * Generates the APPLE_SECRET client secret for Sign in with Apple.
 *
 * Apple does not issue a static client secret. Instead you sign a short-lived
 * ES256 JWT with the .p8 private key from your Apple Developer account. Apple
 * caps its lifetime at 6 months, after which Sign in with Apple stops working —
 * so this has to be regenerated periodically. src/auth.ts logs a warning as the
 * expiry approaches so it fails loudly rather than silently.
 *
 * This runs as a script rather than at request time on purpose: src/auth.ts is
 * imported by src/proxy.ts, which executes on the Edge runtime. Generating the
 * JWT there would drag crypto into the Edge bundle and break the proxy — the
 * same failure mode that firebase-admin caused.
 *
 * Prerequisites, from developer.apple.com:
 *   - App ID with the Sign In with Apple capability
 *   - Services ID (this becomes APPLE_ID, e.g. com.askchetnam.app.signin)
 *   - A Sign in with Apple key; download the .p8 once (Apple won't show it again)
 *
 * Usage:
 *   APPLE_TEAM_ID=XXXXXXXXXX \
 *   APPLE_KEY_ID=YYYYYYYYYY \
 *   APPLE_SERVICES_ID=com.askchetnam.app.signin \
 *   APPLE_P8_PATH=./AuthKey_YYYYYYYYYY.p8 \
 *   npm run apple:secret
 *
 * Then put the printed value in Vercel as APPLE_SECRET, alongside
 * APPLE_ID=<your Services ID>.
 */

import { readFileSync } from 'node:fs';
import { importPKCS8, SignJWT } from 'jose';

const TEAM_ID = process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const SERVICES_ID = process.env.APPLE_SERVICES_ID;
const P8_PATH = process.env.APPLE_P8_PATH;

const missing = Object.entries({ APPLE_TEAM_ID: TEAM_ID, APPLE_KEY_ID: KEY_ID, APPLE_SERVICES_ID: SERVICES_ID, APPLE_P8_PATH: P8_PATH })
    .filter(([, value]) => !value)
    .map(([name]) => name);

if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}\n`);
    console.error('See the comment at the top of this file for usage.');
    process.exit(1);
}

let p8;
try {
    p8 = readFileSync(P8_PATH, 'utf8');
} catch (error) {
    console.error(`Could not read the .p8 key at ${P8_PATH}: ${error.message}`);
    process.exit(1);
}

// Apple's maximum is 6 months (15777000s). Using the full allowance minimises
// how often this has to be repeated.
const SIX_MONTHS_SECONDS = 15777000;
const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + SIX_MONTHS_SECONDS;

try {
    const key = await importPKCS8(p8, 'ES256');

    const jwt = await new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
        .setIssuer(TEAM_ID)        // iss = Team ID
        .setSubject(SERVICES_ID)   // sub = Services ID (the OAuth client_id)
        .setAudience('https://appleid.apple.com')
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt)
        .sign(key);

    const expiryDate = new Date(expiresAt * 1000).toISOString().slice(0, 10);

    console.log('\n=== Sign in with Apple credentials ===\n');
    console.log(`APPLE_ID=${SERVICES_ID}`);
    console.log(`APPLE_SECRET=${jwt}`);
    console.log(`\nExpires: ${expiryDate} — Sign in with Apple breaks after this date.`);
    console.log('Set a reminder; src/auth.ts also warns in the logs from 30 days out.\n');
} catch (error) {
    console.error(`Failed to sign the client secret: ${error.message}`);
    console.error('Check that the .p8 file is the unmodified key downloaded from Apple.');
    process.exit(1);
}
