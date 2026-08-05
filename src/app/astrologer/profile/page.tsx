import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import AstrologerSettings from '@/components/consultations/AstrologerSettings';

export const metadata: Metadata = {
    title: 'Your practice | AskChetna',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AstrologerProfilePage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/astrologer/profile');
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { status: true },
    });
    if (!astrologer) {
        redirect('/astrologer/register');
    }
    // Nothing here is editable before approval, and the desk already explains
    // why. Sending them there beats a form whose every save returns a 403.
    if (astrologer.status !== 'APPROVED') {
        redirect('/astrologer');
    }

    return <AstrologerSettings />;
}
