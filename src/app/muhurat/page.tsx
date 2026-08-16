import type { Metadata } from 'next';
import { Suspense } from 'react';
import MuhuratContent from '@/components/MuhuratContent';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
    title: `Muhurat — when to begin | ${SITE_NAME}`,
    description:
        "Choose what you are about to do and see today's windows for it, worked out from sunrise at your own location using Choghadiya. No claim that timing guarantees anything.",
    alternates: { canonical: '/muhurat' },
    robots: { index: false, follow: true },
};

export default function MuhuratPage() {
    return (
        <Suspense fallback={null}>
            <MuhuratContent />
        </Suspense>
    );
}
