'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/client';

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const hasTracked = useRef<string | null>(null);

    useEffect(() => {
        const search = searchParams.toString();
        const url = search ? `${pathname}?${search}` : pathname;

        // Prevent duplicate tracking for same URL in strict mode/re-renders
        if (hasTracked.current === url) return;
        hasTracked.current = url;

        void trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { path: url });
    }, [pathname, searchParams]);

    return null; // Renderless component
}
