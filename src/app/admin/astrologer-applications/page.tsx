import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin';
import AdminApplicationReview from '@/components/consultations/AdminApplicationReview';
import styles from './page.module.css';

// Review state changes constantly and must never be served from a cache.
export const dynamic = 'force-dynamic';

export default async function AdminApplicationsPage() {
    // Same gate and redirect target as /admin, so a non-admin guessing the URL
    // learns nothing about whether the page exists.
    if (!(await checkAdminAccess())) {
        redirect('/');
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Astrologer applications</h1>
                <p className={styles.subtitle}>
                    First-screening review. Shortlisting records that an applicant passed
                    screening — it does not publish a profile.
                </p>
            </header>
            <AdminApplicationReview />
        </div>
    );
}
