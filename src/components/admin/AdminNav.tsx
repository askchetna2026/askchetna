'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './AdminNav.module.css';

/**
 * Navigation shared by every /admin route.
 *
 * The dashboard's sections are query parameters rather than component state so
 * they can be linked to from here. That is the whole point: while the sections
 * lived in `useState` inside AdminDashboard, nothing outside that component
 * could navigate to one, so /admin/astrologers had no way back to Analytics.
 *
 * A side benefit of the URL carrying the section: back, forward, refresh and
 * "copy this link to the admin who needs to see it" all work now.
 */

/** Sections of the dashboard page itself, as ?tab= values. */
const TABS: Array<[tab: string, label: string]> = [
    ['analytics', 'Analytics'],
    ['users', 'Users'],
    ['creditRequests', 'Credit Requests'],
    ['pricing', 'Pricing & Services'],
    ['newsletter', 'Newsletter'],
    ['lifecycle', 'Lifecycle'],
    ['blogs', 'Blogs'],
];

/**
 * Separate routes, each with its own queue and filters.
 *
 * Grouped and described because "Applications" and "Astrologers" sitting side
 * by side reads as two names for the same screen. They are different stages:
 * an application is someone asking to be considered; an astrologer is a
 * profile that already exists and can be suspended or repriced.
 */
const CONSULTATION_ROUTES: Array<[href: string, label: string]> = [
    ['/admin/astrologer-applications', 'Applications'],
    ['/admin/astrologers', 'Astrologers'],
];

export default function AdminNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const onDashboard = pathname === '/admin';
    // Matches AdminDashboard's own default, so "Analytics" is highlighted on a
    // bare /admin rather than nothing being highlighted at all.
    const currentTab = searchParams.get('tab') ?? 'analytics';

    const cls = (isActive: boolean) =>
        `${styles.navItem} ${isActive ? styles.active : ''}`;

    return (
        <nav className={styles.nav}>
            {TABS.map(([tab, label]) => (
                <Link
                    key={tab}
                    href={`/admin?tab=${tab}`}
                    className={cls(onDashboard && currentTab === tab)}
                >
                    {label}
                </Link>
            ))}

            <span className={styles.groupLabel}>Consultations</span>

            {CONSULTATION_ROUTES.map(([href, label]) => (
                <Link key={href} href={href} className={cls(pathname === href)}>
                    {label}
                </Link>
            ))}
        </nav>
    );
}
