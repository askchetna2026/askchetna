import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin';
import AdminAstrologerReview from '@/components/consultations/AdminAstrologerReview';
import AdminCreateAiAstrologer from '@/components/admin/AdminCreateAiAstrologer';
import styles from './page.module.css';

// Approval state changes constantly and must never be served from a cache.
export const dynamic = 'force-dynamic';

export default async function AdminAstrologersPage() {
    // Same gate and same redirect target as /admin, so a non-admin who guesses
    // the URL learns nothing about whether the page exists.
    if (!(await checkAdminAccess())) {
        redirect('/');
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Astrologers</h1>
                {/* Deliberately does NOT say "review applications" any more. It
                    did, which made this indistinguishable from the Applications
                    queue — two screens that appeared to do the same job. This
                    one is the roster of profiles that already exist. */}
                <p className={styles.subtitle}>
                    Existing astrologer profiles. Suspend or reinstate an account and set
                    individual revenue shares. New applicants are screened under
                    Applications.
                </p>
            </header>

            {/* Above the roster: creating a persona is a deliberate act, and
                burying it under a list of existing profiles is how a feature
                ends up unused. AI personas need no screening — there is no
                human to verify — so this does not belong in Applications. */}
            <AdminCreateAiAstrologer />

            <AdminAstrologerReview />
        </div>
    );
}
