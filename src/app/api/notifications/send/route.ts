import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { sendPushToUsers, type PushPayload } from '@/lib/push/send';

/**
 * Send a push notification. Admin only.
 *
 * Audiences:
 *   { audience: 'self' }                       -> just the caller's devices (test sends)
 *   { audience: 'users', userIds: [...] }      -> specific users
 *   { audience: 'all' }                        -> everyone with an active device
 *
 * 'all' is intentionally the most awkward to invoke and is capped below. A
 * mistaken broadcast can't be recalled, and on iOS it is a fast route to users
 * disabling notifications permanently.
 */

/** Guard against fat-fingering a broadcast to the entire user base. */
const MAX_BROADCAST_RECIPIENTS = 5000;

export async function POST(req: NextRequest) {
    if (!await checkAdminAccess()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { audience, userIds, title, message, path, data } = body;

        if (typeof title !== 'string' || !title.trim()) {
            return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }
        if (typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }

        const payload: PushPayload = {
            title: title.trim().slice(0, 120),
            body: message.trim().slice(0, 400),
            path: typeof path === 'string' && path.startsWith('/') ? path : undefined,
            data: data && typeof data === 'object' ? data : undefined,
        };

        let targetUserIds: string[];

        switch (audience) {
            case 'self': {
                const { auth } = await import('@/auth');
                const session = await auth();
                if (!session?.user?.id) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }
                targetUserIds = [session.user.id];
                break;
            }

            case 'users': {
                if (!Array.isArray(userIds) || userIds.length === 0) {
                    return NextResponse.json({ error: 'userIds is required' }, { status: 400 });
                }
                targetUserIds = userIds.filter((id): id is string => typeof id === 'string');
                break;
            }

            case 'all': {
                // Only users who actually have a live device, so the count
                // reflects real reach rather than total signups.
                const rows = await prisma.deviceToken.findMany({
                    where: { disabledAt: null },
                    select: { userId: true },
                    distinct: ['userId'],
                    take: MAX_BROADCAST_RECIPIENTS + 1,
                });

                if (rows.length > MAX_BROADCAST_RECIPIENTS) {
                    return NextResponse.json(
                        {
                            error: `Broadcast would exceed ${MAX_BROADCAST_RECIPIENTS} recipients. ` +
                                'Send in explicit batches via audience: "users" instead.',
                        },
                        { status: 413 }
                    );
                }

                targetUserIds = rows.map((r) => r.userId);
                break;
            }

            default:
                return NextResponse.json(
                    { error: 'audience must be one of: self, users, all' },
                    { status: 400 }
                );
        }

        const result = await sendPushToUsers(targetUserIds, payload);

        return NextResponse.json({
            recipients: targetUserIds.length,
            ...result,
        });
    } catch (error) {
        console.error('Push send error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
