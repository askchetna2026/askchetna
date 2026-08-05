import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { LANGUAGES, EXPERTISE_AREAS } from '@/lib/astrologerApplication';

/**
 * An astrologer's own published profile — the text and tags seekers read in the
 * directory.
 *
 * This endpoint has to exist. `PATCH /api/admin/astrologers/[id]` deliberately
 * refuses to edit a human's displayName or bio ("theirs to write"), so without a
 * self-serve route the published words are frozen at whatever the application
 * said, forever, with nobody able to correct a typo.
 *
 * What is NOT editable here is as deliberate as what is: status, revenue share
 * and credits per block are commercial terms, and an astrologer who could set
 * their own rate or approve themselves would make the admin gate decorative.
 */

const MAX_LANGUAGES = 8;
const MAX_SPECIALITIES = 10;

/** Kept to the same vocabulary the application collected, so the directory
 *  filters keep matching. Free text here would fragment the tag list into
 *  near-duplicates nothing can group. */
function cleanList(input: unknown, allowed: readonly string[], max: number): string[] | null {
    if (!Array.isArray(input)) return null;
    const picked = input.filter((v): v is string => typeof v === 'string' && allowed.includes(v));
    return [...new Set(picked)].slice(0, max);
}

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: {
            displayName: true,
            bio: true,
            photoUrl: true,
            languages: true,
            specialities: true,
            status: true,
            creditsPerBlock: true,
        },
    });
    if (!astrologer) {
        return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    }

    return NextResponse.json({
        profile: { ...astrologer, creditsPerBlock: astrologer.creditsPerBlock ?? 1 },
        options: { languages: LANGUAGES, specialities: EXPERTISE_AREAS },
    });
}

export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true, isAI: true },
    });
    if (!astrologer) {
        return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    }
    // A suspended profile editing its own copy would be publishing while
    // suspended, which is what suspension is supposed to stop.
    if (astrologer.status !== 'APPROVED') {
        return NextResponse.json(
            {
                error: 'Not approved',
                message: `Your profile is ${astrologer.status.toLowerCase()}. You cannot change what seekers see.`,
            },
            { status: 403 }
        );
    }

    let body: {
        displayName?: string;
        bio?: string;
        languages?: unknown;
        specialities?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.displayName !== undefined) {
        const name = body.displayName.trim();
        // Same bounds as the admin route uses for AI personas, so the directory
        // never has to lay out a name one surface allowed and the other did not.
        if (name.length < 2 || name.length > 60) {
            return NextResponse.json(
                { error: 'Your display name must be between 2 and 60 characters.' },
                { status: 400 }
            );
        }
        data.displayName = name;
    }

    if (body.bio !== undefined) {
        data.bio = body.bio.trim().slice(0, 2000) || null;
    }

    if (body.languages !== undefined) {
        const languages = cleanList(body.languages, LANGUAGES, MAX_LANGUAGES);
        if (!languages || languages.length === 0) {
            return NextResponse.json(
                { error: 'Choose at least one language you consult in.' },
                { status: 400 }
            );
        }
        data.languages = languages;
    }

    if (body.specialities !== undefined) {
        const specialities = cleanList(body.specialities, EXPERTISE_AREAS, MAX_SPECIALITIES);
        if (!specialities || specialities.length === 0) {
            return NextResponse.json(
                { error: 'Choose at least one area you read for.' },
                { status: 400 }
            );
        }
        data.specialities = specialities;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.astrologer.update({
        where: { id: astrologer.id },
        data,
        select: {
            displayName: true,
            bio: true,
            languages: true,
            specialities: true,
        },
    });

    return NextResponse.json({ profile: updated, message: 'Saved. Seekers see this now.' });
}
