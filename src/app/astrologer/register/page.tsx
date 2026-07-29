import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { STATUS_LABELS } from '@/lib/astrologerApplication';
import AstrologerApplicationForm from '@/components/consultations/AstrologerApplicationForm';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Become an AskChetna Astrologer',
    description:
        'Apply to offer consultations on AskChetna. Tell us about your practice, experience and approach. Every application is reviewed before approval.',
    alternates: { canonical: '/astrologer/register' },
};

export const dynamic = 'force-dynamic';

export default async function AstrologerRegisterPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/astrologer/register');
    }

    // Read on the server so the right thing renders on first paint. Fetching
    // client-side would flash an empty form at someone who has already applied,
    // which reads as though their application was lost.
    const [application, user] = await Promise.all([
        prisma.astrologerApplication.findFirst({
            where: { userId: session.user.id },
            orderBy: { submittedAt: 'desc' },
            select: {
                ref: true,
                status: true,
                rejectionReason: true,
                infoRequest: true,
            },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, phone: true },
        }),
    ]);

    // A rejected application does not block reapplying (spec §22), so it is not
    // treated as an existing one to display.
    const blocking = application && application.status !== 'REJECTED' ? application : null;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <span className="cosmic-label">❋ Acharya · Astrologer ❋</span>
                <h1 className="mystic-text">Become an AskChetna Astrologer</h1>
                <div className="sacred-divider"></div>
                <p className={styles.intro}>
                    Share your knowledge and perspective with seekers looking for guidance.
                    Tell us about your practice, experience, and approach to consultations.
                    Every application is reviewed by the AskChetna team before approval.
                </p>
            </header>

            <AstrologerApplicationForm
                prefillEmail={user?.email ?? ''}
                prefillName={user?.name ?? ''}
                prefillPhone={user?.phone ?? ''}
                existing={
                    blocking
                        ? {
                              ref: blocking.ref,
                              status: blocking.status,
                              statusLabel: STATUS_LABELS[blocking.status] ?? blocking.status,
                              rejectionReason: blocking.rejectionReason,
                              infoRequest: blocking.infoRequest,
                          }
                        : null
                }
            />
        </div>
    );
}
