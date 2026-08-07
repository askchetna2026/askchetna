'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Orbit, MessageSquare, CalendarClock, User, LogIn } from 'lucide-react';
import styles from './AppTabBar.module.css';

/**
 * Bottom tab bar for the native apps.
 *
 * Rendered on every page but hidden by CSS unless <html> carries `.native-app`
 * (set pre-paint by PLATFORM_BOOTSTRAP_SCRIPT). Doing the platform switch in CSS
 * rather than JS is deliberate: reading headers() in the root layout would force
 * every route into dynamic rendering, and a client-side check would either flash
 * the wrong chrome or mismatch during hydration. The cost is ~1KB of markup that
 * browsers never paint — and `display: none` keeps it out of the accessibility
 * tree, so screen readers on the web don't see a second navigation.
 *
 * Lives in the root layout, above the routes, so tab switches swap only the page
 * body. The bar itself never re-mounts, which is what makes navigation read as an
 * app rather than a series of page loads.
 */

type Tab = {
    href: string;
    label: string;
    icon: typeof Home;
    /** Also mark active for nested routes, e.g. /chart/xyz. */
    match?: string[];
};

export default function AppTabBar() {
    const pathname = usePathname();
    const { status } = useSession();
    const authed = status === 'authenticated';

    // Full-screen flows own the whole viewport; a tab bar under them just gets
    // in the way of the one action the screen is asking for.
    if (pathname === '/login' || pathname.startsWith('/onboarding')) return null;

    const tabs: Tab[] = [
        // Signed-in users get /today as home — the marketing homepage is a web
        // surface and has nothing to offer someone already inside the product.
        // "/" is matched too: the proxy rewrites it to /today for signed-in
        // native requests, so the URL stays "/" while Today renders and this tab
        // still needs to light up.
        { href: authed ? '/today' : '/', label: 'Today', icon: Home, match: authed ? ['/'] : [] },
        { href: '/chart', label: 'Chart', icon: Orbit, match: ['/report', '/how-we-calculate'] },
        { href: '/clarity', label: 'Ask', icon: MessageSquare, match: ['/ai-astrologer'] },
        { href: '/timing', label: 'Timing', icon: CalendarClock, match: ['/dasha-timeline'] },
        authed
            // /dashboard joins this tab now that Today has taken over as home:
            // what is left there is profiles, credits and exports, which is the
            // "Me" half of the app rather than a second landing screen.
            ? { href: '/account', label: 'Me', icon: User, match: ['/app-info', '/pricing', '/dashboard'] }
            : { href: '/login', label: 'Sign In', icon: LogIn },
    ];

    const isActive = (tab: Tab) => {
        const roots = [tab.href, ...(tab.match ?? [])];
        return roots.some((root) =>
            root === '/' ? pathname === '/' : pathname === root || pathname.startsWith(`${root}/`)
        );
    };

    return (
        <nav className={styles.tabBar} aria-label="Primary">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab);
                return (
                    <Link
                        key={tab.label}
                        href={tab.href}
                        className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                        aria-current={active ? 'page' : undefined}
                    >
                        <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
                        <span className={styles.label}>{tab.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
