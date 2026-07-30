import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin';
import AdminNav from '@/components/admin/AdminNav';
import styles from './layout.module.css';

/**
 * Shell for every /admin route.
 *
 * The access check lives here so it covers this route and everything nested
 * under it. Each page keeps its own check too — a layout is not a security
 * boundary in the App Router, since a client-side navigation can render a page
 * without re-running its parent layout, and route handlers never run it at all.
 * Two cheap session reads is the right trade against an admin page that
 * renders for someone who should not see it.
 *
 * Redirects to / rather than showing a 403, matching the existing pages: a
 * non-admin who guesses a URL learns nothing about whether it exists.
 */
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    if (!(await checkAdminAccess())) {
        redirect('/');
    }

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <h2 className={styles.logo}>AskChetna Admin</h2>
                {/* useSearchParams needs a Suspense boundary above it. The
                    fallback is the empty nav rather than nothing, so the
                    sidebar does not change width as it resolves. */}
                <Suspense fallback={<nav />}>
                    <AdminNav />
                </Suspense>
            </aside>

            <main className={styles.content}>{children}</main>
        </div>
    );
}
