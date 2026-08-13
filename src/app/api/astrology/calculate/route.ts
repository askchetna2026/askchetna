import { NextRequest, NextResponse } from 'next/server';
import { calculateChart } from '@/lib/astrology/calculator';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    let body: {
        year: string;
        month: string;
        day: string;
        hour: number;
        minute: number;
        lat: string;
        lng: string;
        timezone?: string;
    } | undefined;
    try {
        // Try to get session, but don't let it fail the whole route if auth is misconfigured
        try {
            await auth();
        } catch (e) {
            console.error('Auth check failed in calculation route:', e);
        }

        body = await req.json();
        if (!body) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        const { year, month, day, hour, minute, lat, lng, timezone } = body;

        if (!year || !month || !day || lat === undefined || lng === undefined) {
            return NextResponse.json(
                { error: 'Missing required birth details (date, lat, lng)' },
                { status: 400 }
            );
        }

        // Convert hour/minute to decimal hour in UTC
        // Note: User should handle timezone offset before sending or we calculate here
        // For simplicity, let's assume body includes 'timezone' and handles UTC conversion
        const decimalHour = hour + (minute / 60);

        // Birth chart only.
        //
        // This used to also compute a transit chart for "now" and return it as
        // `transits`. Both callers (BirthDataForm, ChartPageContent) write the
        // whole response straight into Profile.chartData, so that snapshot was
        // persisted — stale the moment it was written, never read by anything,
        // and 95% of the stored row: a full transit chart carries its own 17
        // vargas and its own dasha tree. Transits are time-dependent by
        // definition and are served live from /api/astrology/transit(s).
        //
        // Dropping it also halves the work this endpoint does, which is on the
        // critical path of creating a profile.
        const chartData = await calculateChart(
            parseInt(year),
            parseInt(month),
            parseInt(day),
            decimalHour,
            parseFloat(lat),
            parseFloat(lng),
            timezone ? parseFloat(timezone) : 5.5
        );

        return NextResponse.json(chartData);
    } catch (error) {
        console.error('Calculation error:', error);
        // Standard error logging
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
        } else {
            console.error('Unknown error type:', String(error));
        }

        // Specific WASM hints
        if (String(error).includes('swisseph')) {
            console.error('POTENTIAL WASM ISSUE: swisseph-wasm module failed to load or execute. Check next.config.ts for asyncWebAssembly support.');
        }

        console.error('Request body:', body);
        return NextResponse.json(
            {
                error: 'Failed to calculate astrological chart',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
