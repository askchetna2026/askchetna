import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * The signed-in user, confirmed to still exist.
 *
 * Sessions here are JWTs: the id is carried in the cookie and is never checked
 * against the database on an ordinary request. That is the point — it is what
 * keeps auth() cheap — but it means a token can outlive the row it names, and
 * the cookie stays valid for thirty days.
 *
 * When that happens, every write keyed on the id fails deep inside Prisma with
 * `Foreign key constraint violated: Profile_userId_fkey`, surfacing as a 500
 * and a "Failed to save profile." toast. Nothing in that tells the seeker the
 * one thing that fixes it, which is to sign in again.
 *
 * This is not a hypothetical. Account deletion is a shipped feature with a
 * seven-day grace period, so a row genuinely does disappear while tokens
 * referencing it are still live — and it happens on any environment whose
 * database is restored or rebuilt underneath a signed-in browser.
 *
 * Costs one indexed lookup by primary key, on write paths only. Read paths that
 * merely return nothing for a missing user do not need it.
 */
export type RequireUserResult =
    | { ok: true; userId: string }
    | { ok: false; response: NextResponse };

export async function requireUser(): Promise<RequireUserResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const exists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
    });

    if (!exists) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: 'Your session refers to an account that no longer exists. Please sign in again.',
                    code: 'SESSION_STALE',
                },
                { status: 401 }
            ),
        };
    }

    return { ok: true, userId: exists.id };
}
