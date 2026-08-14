'use client';

import { Suspense } from 'react';
import ChartPageContent from '@/components/ChartPageContent';

export default function ChartPage() {
    return (
        <Suspense fallback={
            <div className="spinner-centre">
                <div className="spinner" role="status" aria-label="Loading" />
            </div>
        }>
            <ChartPageContent />
        </Suspense>
    );
}
