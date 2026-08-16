import type { Metadata } from 'next';
import { Suspense } from 'react';
import SavedInsightsContent from '@/components/SavedInsightsContent';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
    title: `Saved insights | ${SITE_NAME}`,
    description: 'Readings you chose to keep, with the period each one belonged to.',
    alternates: { canonical: '/saved' },
    // Personal, and behind a sign-in. Nothing here should be indexed.
    robots: { index: false, follow: false },
};

export default function SavedPage() {
    return (
        <Suspense fallback={null}>
            <SavedInsightsContent />
        </Suspense>
    );
}
