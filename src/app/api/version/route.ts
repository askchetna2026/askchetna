import { NextResponse } from 'next/server';
import { getPackageVersion } from '@/lib/updates/packageVersion';

/**
 * GET /api/version — what is deployed right now.
 *
 * Clients compare this against the values compiled into their own bundle to work
 * out whether the page they are running predates the current deployment.
 *
 * `buildId` is what detects staleness: Vercel's commit SHA changes on every
 * deploy, so no one has to remember to bump anything for an update to be
 * noticed. `version` only decides how urgently to apply it.
 *
 * Deliberately free of side effects. Broadcasting from here looks tempting —
 * it fires right after a deploy — but "have we already announced this?" would
 * have to live in the instance's memory, and every cold-started Vercel instance
 * starts with that memory empty. Each one would decide the deploy was new and
 * notify every user again. The announcement belongs in the deploy step
 * (POST /api/notifications/send-update), which runs once.
 */
export async function GET() {
    return NextResponse.json(
        {
            version: getPackageVersion(),
            // Read at runtime rather than inlined, but resolves to the same
            // value the client baked in, because both come from one deployment.
            buildId: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
            releaseDate: new Date().toISOString().split('T')[0],
            critical: false,
            changelog: 'Latest improvements and fixes',
            minNativeVersion: '1.0.0',
        },
        {
            // no-store: a cached copy would keep reporting the pre-deploy version
            // and hide the very change this endpoint exists to reveal.
            headers: { 'Cache-Control': 'no-store' },
        }
    );
}
