import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

/**
 * What a seeker agrees to be told about.
 *
 * The absence of a row means "never asked", not "said no", so GET returns the
 * schema defaults rather than 404. That distinction is the whole reason this is
 * a separate table: a missing row and a row full of falses are different
 * states, and collapsing them would silently opt everybody out the moment the
 * table was added.
 */

const KEYS = ['dailyGuidance', 'periodChange', 'appointments'] as const;
type Key = (typeof KEYS)[number];

/** Must match the defaults in schema.prisma. */
const DEFAULTS: Record<Key, boolean> = {
    dailyGuidance: false,
    periodChange: true,
    appointments: true,
};

export async function GET() {
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    const row = await prisma.notificationPreference.findUnique({
        where: { userId: authed.userId },
        select: { dailyGuidance: true, periodChange: true, appointments: true },
    });

    return NextResponse.json({ preferences: row ?? DEFAULTS, chosen: !!row });
}

export async function PUT(req: Request) {
    // requireUser, not auth(): this inserts a row with a userId foreign key.
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // Only the known keys, and only booleans. A partial body updates only what
    // it names, so a client that does not know about a newly added kind cannot
    // silently reset it.
    const patch: Partial<Record<Key, boolean>> = {};
    for (const key of KEYS) {
        if (typeof body[key] === 'boolean') patch[key] = body[key] as boolean;
    }

    if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const row = await prisma.notificationPreference.upsert({
        where: { userId: authed.userId },
        create: { userId: authed.userId, ...DEFAULTS, ...patch },
        update: patch,
        select: { dailyGuidance: true, periodChange: true, appointments: true },
    });

    return NextResponse.json({ preferences: row });
}
