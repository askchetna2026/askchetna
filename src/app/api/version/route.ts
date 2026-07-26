import { NextResponse } from 'next/server';
import { getPackageVersion } from '@/lib/updates/packageVersion';

/**
 * GET /api/version — what is deployed right now.
 *
 * Clients compare this against the version compiled into their own bundle
 * (NEXT_PUBLIC_APP_VERSION) to tell whether the page they are running predates
 * the current deployment.
 *
 * Deliberately free of side effects. Broadcasting from here looks tempting —
 * it fires right after a deploy — but "have we already announced this version?"
 * would have to live in the instance's memory, and every cold-started Vercel
 * instance starts with that memory empty. Each one would decide the version was
 * new and notify every user again. The announcement belongs in the deploy step
 * (POST /api/notifications/send-update), which runs once.
 */
export async function GET() {
    return NextResponse.json(
        {
            version: getPackageVersion(),
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
