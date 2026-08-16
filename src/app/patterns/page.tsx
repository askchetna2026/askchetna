import type { Metadata } from 'next';
import { Suspense } from 'react';
import PatternsPageContent from '@/components/PatternsPageContent';
import { SITE_NAME } from '@/lib/site';

/**
 * The calm answer to the four terms people search when they are worried.
 *
 * Sade Sati, Mangal Dosha and Kala Sarpa carry enormous search volume, and most
 * of what that search returns is written to sell a remedy. All three have been
 * calculable here for months — the engine has decided them on every chart load
 * — but nothing ever showed the result, so the only thing a worried seeker
 * could do with the question was take it somewhere else.
 */
export const metadata: Metadata = {
    title: `Sade Sati, Mangal Dosha and Kala Sarpa in your chart | ${SITE_NAME}`,
    description:
        'Whether the well-known Vedic conditions apply to your chart, which placements decide each one, and what moderates them. Calculated, explained, and not used to frighten you.',
    alternates: { canonical: '/patterns' },
};

export default function PatternsPage() {
    return (
        <Suspense fallback={null}>
            <PatternsPageContent />
        </Suspense>
    );
}
