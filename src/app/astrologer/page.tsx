import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import AstrologerDashboard from '@/components/consultations/AstrologerDashboard';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Astrologer Dashboard | AskChetna',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AstrologerHomePage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/astrologer');
    }

    // Someone with no astrologer record has come here by guessing or from a
    // stale link; send them to apply rather than showing an empty dashboard.
    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });
    if (!astrologer) {
        redirect('/astrologer/register');
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Your consultations</h1>
                <p className={styles.subtitle}>
                    Go available to appear in the directory. You stay listed while this page
                    is open.
                </p>
            </header>

            <AstrologerDashboard />
        </div>
    );
}
