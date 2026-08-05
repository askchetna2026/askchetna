import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import AstrologerHome from '@/components/consultations/AstrologerHome';

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

    // The same screen `/` gives an approved astrologer. This route stays as the
    // stable address for it — it is what the profile menu links to, and what an
    // astrologer approved since their last sign-in reaches while the flag on
    // their session token is still stale.
    return <AstrologerHome />;
}
