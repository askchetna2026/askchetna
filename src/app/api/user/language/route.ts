import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { DEFAULT_LANGUAGE, isLanguage } from '@/lib/i18n/terms';

/**
 * Which language Chetna writes in for this seeker.
 *
 * Deliberately its own tiny route rather than folded into /api/user/profile:
 * the profile endpoint returns a lot and is called on paths that do not care
 * about language, and this is read by the profile menu on every page.
 */

export async function GET() {
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    const user = await prisma.user.findUnique({
        where: { id: authed.userId },
        // One column. See the note about P2022 on wide reads in CLAUDE.md.
        select: { language: true },
    });

    return NextResponse.json({
        language: isLanguage(user?.language) ? user.language : DEFAULT_LANGUAGE,
    });
}

export async function PUT(req: Request) {
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    let body: { language?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // Validated against the known set rather than stored as given: this value
    // is interpolated into every prompt, and an arbitrary string there is an
    // instruction to the model from whoever sent the request.
    if (!isLanguage(body.language)) {
        return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    const user = await prisma.user.update({
        where: { id: authed.userId },
        data: { language: body.language },
        select: { language: true },
    });

    return NextResponse.json({ language: user.language });
}
