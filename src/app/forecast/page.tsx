import type { Metadata } from 'next';
import { Suspense } from 'react';
import ForecastContent from '@/components/ForecastContent';
import { SITE_NAME } from '@/lib/site';

/**
 * Horizons, not horoscopes.
 *
 * The distinction is the whole feature: everything on this page is a dated
 * event taken from the seeker's own dasha tree and the actual sky, so there is
 * nothing here that could be written for a stranger who shares a Sun sign.
 */
export const metadata: Metadata = {
    title: `What is ahead — tomorrow, this week, this month | ${SITE_NAME}`,
    description:
        'Your dasha boundaries and the slow transits reaching your chart, with dates. Calculated from your own chart rather than written for a zodiac sign.',
    alternates: { canonical: '/forecast' },
    robots: { index: false, follow: true },
};

export default function ForecastPage() {
    return (
        <Suspense fallback={null}>
            <ForecastContent />
        </Suspense>
    );
}
