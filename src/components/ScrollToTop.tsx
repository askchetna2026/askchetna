'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Start every navigation at the top of the page.
 *
 * Arriving at /clarity or a consultation halfway down the document is
 * disorienting — the seeker has to scroll up to find the thing they navigated
 * for. The App Router is supposed to handle this, but it does not do it
 * reliably here: several of these screens paint a short loading state first and
 * grow once their data arrives, and the scroll decision is taken against the
 * short version.
 *
 * Two deliberate details:
 *
 * BACK AND FORWARD ARE LEFT ALONE. Returning to a page you scrolled through
 * should land where you were, not at the top — that is the browser's restore
 * behaviour, and clobbering it on every route change would be a worse bug than
 * the one being fixed. The popstate flag distinguishes a pop from a push.
 *
 * NOT SMOOTH. Navigation happens constantly, and a 400ms animated scroll on
 * arrival is motion the seeker did not ask for and has to wait through. Jumping
 * is correct here; smooth scrolling is for in-page anchors.
 *
 * Keyed on pathname alone, not the search string, so switching profile on
 * /chart?profileId= does not throw the reader back to the top of a chart they
 * were reading.
 */
export default function ScrollToTop() {
    const pathname = usePathname();
    const cameFromHistory = useRef(false);

    useEffect(() => {
        const onPop = () => {
            cameFromHistory.current = true;
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    useEffect(() => {
        if (cameFromHistory.current) {
            cameFromHistory.current = false;
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
