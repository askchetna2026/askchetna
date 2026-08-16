import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

/**
 * Let go of something kept.
 *
 * A collection you cannot remove from stops being a collection and becomes a
 * log, and people keep fewer things when they cannot unkeep them.
 */
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    const { id } = await params;

    // deleteMany scoped to the owner rather than delete-by-id: it makes the
    // ownership check part of the same statement, so there is no window between
    // reading who owns it and removing it.
    const result = await prisma.savedInsight.deleteMany({
        where: { id, userId: authed.userId },
    });

    if (result.count === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
