import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Retire this device's push token.
 *
 * Called on sign-out and when the user turns notifications off in settings.
 *
 * Deliberately NOT auth-gated. Sign-out is the main caller, and by then the
 * session may already be gone — requiring auth would leave the token live and
 * the next owner of the device would receive the previous user's notifications.
 * Knowing an opaque FCM token is the capability here, and the only thing this
 * can do is stop delivery, so it is not a useful target.
 *
 * Rows are disabled rather than deleted, so re-registering the same install
 * reuses the row instead of accumulating duplicates.
 */
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (typeof token !== 'string' || token.length < 20) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        await prisma.deviceToken.updateMany({
            where: { token, disabledAt: null },
            data: { disabledAt: new Date() },
        });

        // Always report success: whether the token existed is not information
        // this endpoint should confirm.
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Push token unregistration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
