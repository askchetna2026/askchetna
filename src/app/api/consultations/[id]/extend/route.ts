import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { extendConsultation } from '@/lib/consultations/session';

/**
 * Buys one more block.
 *
 * The client raises the prompt; this decides. Scoped to the paying user — an
 * astrologer cannot extend a session on someone else's credits, however
 * well-intentioned.
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await extendConsultation(id, session.user.id);

    if (!result.ok) {
        switch (result.reason) {
            case 'INSUFFICIENT_CREDITS':
                return NextResponse.json(
                    {
                        error: 'Insufficient credits',
                        message: 'You need 1 credit to extend this consultation.',
                        available: result.available,
                    },
                    { status: 402 }
                );
            case 'EXPIRED':
                // Deliberately not extendable. Reconnecting an hour later must
                // not resume a slot the astrologer has long since given up.
                return NextResponse.json(
                    {
                        error: 'Session expired',
                        message: 'This consultation has already ended. Please start a new one.',
                    },
                    { status: 409 }
                );
            case 'NOT_ACTIVE':
                return NextResponse.json(
                    { error: 'Consultation is not active' },
                    { status: 409 }
                );
        }
    }

    return NextResponse.json({
        deadlineAt: result.deadlineAt.toISOString(),
        creditsCharged: result.creditsCharged,
    });
}
