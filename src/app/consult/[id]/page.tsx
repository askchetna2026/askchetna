import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import ChatSession from '@/components/consultations/ChatSession';

export const metadata: Metadata = {
    title: 'Consultation | AskChetna',
    // A live, private conversation. Nothing here belongs in an index.
    robots: { index: false, follow: false },
};

export default async function ConsultationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        redirect(`/login?callbackUrl=/consult/${id}`);
    }

    // Membership is checked here as well as in the API. The page would render an
    // empty shell for a stranger otherwise, and "this exists but you cannot see
    // it" is more information than a stranger needs — hence notFound rather than
    // a 403.
    const consultation = await prisma.consultation.findUnique({
        where: { id },
        select: {
            id: true,
            userId: true,
            astrologer: { select: { userId: true } },
        },
    });

    const isParticipant =
        consultation &&
        (consultation.userId === session.user.id ||
            consultation.astrologer.userId === session.user.id);

    if (!isParticipant) notFound();

    return <ChatSession consultationId={id} />;
}
