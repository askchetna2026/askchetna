
import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin';
import AdminDashboard, { type AdminTab } from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

/**
 * Valid ?tab= values. Anything else falls back to analytics rather than
 * rendering an empty console — a mistyped or stale link should land somewhere
 * useful, not on a blank page.
 */
const TABS: AdminTab[] = [
    'analytics',
    'users',
    'creditRequests',
    'pricing',
    'newsletter',
    'lifecycle',
    'blogs',
];

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    // Re-checked here as well as in the layout: a layout is not a security
    // boundary, since a client-side navigation can render this page without
    // re-running the layout above it.
    const isAdmin = await checkAdminAccess();

    if (!isAdmin) {
        redirect('/');
    }

    const { tab } = await searchParams;
    const activeTab = TABS.includes(tab as AdminTab) ? (tab as AdminTab) : 'analytics';

    return <AdminDashboard activeTab={activeTab} />;
}
