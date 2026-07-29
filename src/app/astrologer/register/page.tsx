import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import AstrologerRegistrationForm from '@/components/consultations/AstrologerRegistrationForm';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Become an Astrologer | AskChetna',
    description:
        'Apply to offer consultations on AskChetna. Every application is reviewed before an astrologer appears in the directory.',
    alternates: { canonical: '/astrologer/register' },
};

export default async function AstrologerRegisterPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/astrologer/register');
    }

    // Read the existing application on the server so the page renders the right
    // thing on first paint. Fetching it client-side would show the empty form
    // for a moment to someone who has already applied, which reads as though
    // their application was lost.
    const existing = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { status: true, rejectionReason: true },
    });

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <span className="cosmic-label">❋ Acharya · Astrologer ❋</span>
                <h1 className="mystic-text">Offer Consultations</h1>
                <div className="sacred-divider"></div>
                <p className={styles.intro}>
                    Share your practice with people looking for perspective. Seekers spend
                    credits to consult you, and you are paid a share of every credit served.
                </p>
            </header>

            <AstrologerRegistrationForm
                existingStatus={
                    (existing?.status as 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED') ??
                    null
                }
                existingRejectionReason={existing?.rejectionReason ?? null}
            />
        </div>
    );
}
