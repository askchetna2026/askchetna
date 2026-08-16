import type { Metadata } from 'next';
import { Suspense } from 'react';
import PrakritiContent from '@/components/PrakritiContent';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
    title: `Your Prakriti, read from your chart | ${SITE_NAME}`,
    description:
        'Vata, Pitta or Kapha, derived from your rising sign, its ruler, your Moon and anything standing in the first house — with every factor shown. Not medical advice.',
    alternates: { canonical: '/prakriti' },
    robots: { index: false, follow: true },
};

export default function PrakritiPage() {
    return (
        <Suspense fallback={null}>
            <PrakritiContent />
        </Suspense>
    );
}
