import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { startConsultation } from '@/lib/consultations/session';
import { getSettings, type ConsultationKind } from '@/lib/consultations/settings';
import { isNativeApp } from '@/lib/platform';

/**
 * Opens a consultation, charging the first block.
 *
 * Calls are restricted to the native apps by default — a product decision, not a
 * technical one. WebRTC is a browser API and desktop browsers carry audio and
 * video perfectly well; what native buys is everything around the call, namely
 * surviving backgrounding, ringing through push when the app is closed, audio
 * routing, and lock-screen call UI.
 *
 * Governed by the ALLOW_WEB_CALLS setting so it can be revisited without a
 * deploy. The check lives here rather than in the client because a client-side
 * restriction is a suggestion, and this one gates a credit being spent.
 */
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { astrologerId?: string; kind?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { astrologerId } = body;
    const kind = (body.kind ?? 'CHAT').toUpperCase() as ConsultationKind;

    if (!astrologerId) {
        return NextResponse.json({ error: 'astrologerId is required' }, { status: 400 });
    }
    if (!['CHAT', 'AUDIO', 'VIDEO'].includes(kind)) {
        return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 });
    }

    if (kind !== 'CHAT') {
        const settings = await getSettings();
        const webCallsAllowed = settings.ALLOW_WEB_CALLS === 1;
        if (!webCallsAllowed && !(await isNativeApp())) {
            return NextResponse.json(
                {
                    error: 'Calls are available in the app only',
                    message:
                        'Audio and video consultations need the AskChetna app. Chat works everywhere.',
                },
                { status: 400 }
            );
        }
    }

    const result = await startConsultation(session.user.id, astrologerId, kind);

    if (!result.ok) {
        switch (result.reason) {
            case 'INSUFFICIENT_CREDITS':
                // 402 matches how /api/clarity/ask reports the same condition.
                return NextResponse.json(
                    {
                        error: 'Insufficient credits',
                        message: 'You need at least 1 credit to start a consultation.',
                        available: result.available,
                    },
                    { status: 402 }
                );
            case 'ASTROLOGER_UNAVAILABLE':
                return NextResponse.json(
                    {
                        error: 'Astrologer unavailable',
                        message: 'This astrologer is not taking consultations right now.',
                    },
                    { status: 409 }
                );
            case 'ALREADY_IN_SESSION':
                return NextResponse.json(
                    {
                        error: 'Already in a session',
                        message: 'Finish your current consultation before starting another.',
                        consultationId: result.consultationId,
                    },
                    { status: 409 }
                );
        }
    }

    return NextResponse.json({
        consultationId: result.consultationId,
        // Null until the first message starts the clock. The client shows the
        // full block rather than a countdown until then.
        deadlineAt: result.deadlineAt?.toISOString() ?? null,
        secondsPerBlock: result.secondsPerBlock,
        kind,
    });
}
