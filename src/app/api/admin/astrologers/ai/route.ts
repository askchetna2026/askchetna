import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { uploadProfilePhoto, storageConfigured } from '@/lib/photoUpload';
import { photoPointer } from '@/lib/astrologerPhoto';
import { buildSystemPrompt, buildPortraitPrompt } from '@/lib/ai/personaPrompt';

/**
 * Creates an AI astrologer from the admin console.
 *
 * Until now the only way to add one was editing scripts/seed-ai-astrologers.mjs
 * and running it against each database by hand, which meant a new persona was a
 * deploy rather than an afternoon's decision.
 *
 * The portrait is UPLOADED, not generated. There is no image provider wired
 * into this codebase and adding one would mean a new key and a per-image cost;
 * more to the point, the last set of generated portraits was rejected, so the
 * useful half of the job is the brief rather than the picture. GET returns that
 * brief for a proposed persona so an admin can see it before committing.
 *
 * Accepts multipart so the persona and its portrait arrive together — a
 * half-created astrologer with no face is a directory entry nobody will click.
 */

// Image processing is CPU-bound; a 5 MB upload takes a moment.
export const maxDuration = 30;

/* Not exported: a route module may only export handlers. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_NAME = 60;
const MAX_BIO = 800;

function parseList(raw: FormDataEntryValue | null): string[] {
    if (typeof raw !== 'string') return [];
    return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

/**
 * Previews the two prompts without creating anything.
 *
 * Query params mirror the form fields, so the console can show the portrait
 * brief the moment a name and a topic exist.
 */
export async function GET(request: Request) {
    const session = await auth();
    if (!(await isAdmin(session?.user?.email ?? null))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const displayName = (url.searchParams.get('displayName') ?? '').trim();
    if (!displayName) {
        return NextResponse.json({ error: 'A name is needed first.' }, { status: 400 });
    }

    const input = {
        displayName,
        specialities: (url.searchParams.get('specialities') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        languages: (url.searchParams.get('languages') ?? 'en').split(',').map((s) => s.trim()).filter(Boolean),
        tone: url.searchParams.get('tone') ?? undefined,
        notes: url.searchParams.get('notes') ?? undefined,
    };

    return NextResponse.json({
        portraitPrompt: buildPortraitPrompt(input),
        systemPrompt: buildSystemPrompt(input),
    });
}

export async function POST(request: Request) {
    const session = await auth();
    const adminEmail = session?.user?.email ?? null;
    if (!(await isAdmin(adminEmail))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Send this as a form.' }, { status: 400 });
    }

    const displayName = String(form.get('displayName') ?? '').trim();
    const bio = String(form.get('bio') ?? '').trim();
    const tone = String(form.get('tone') ?? '').trim();
    const notes = String(form.get('notes') ?? '').trim();
    const specialities = parseList(form.get('specialities'));
    const languages = parseList(form.get('languages'));
    const aiModel = String(form.get('aiModel') ?? '').trim();

    if (!displayName || displayName.length > MAX_NAME) {
        return NextResponse.json(
            { error: `Give them a name, under ${MAX_NAME} characters.` },
            { status: 400 }
        );
    }
    if (specialities.length === 0) {
        return NextResponse.json(
            { error: 'List at least one area of expertise — it is what the persona is built around.' },
            { status: 400 }
        );
    }
    if (bio.length > MAX_BIO) {
        return NextResponse.json({ error: `Keep the bio under ${MAX_BIO} characters.` }, { status: 400 });
    }

    // Names are how seekers tell personas apart; two Vidhis is a support ticket.
    const clash = await prisma.astrologer.findFirst({
        where: { displayName, isAI: true },
        select: { id: true },
    });
    if (clash) {
        return NextResponse.json(
            { error: `There is already an AI astrologer called ${displayName}.` },
            { status: 409 }
        );
    }

    const personaInput = {
        displayName,
        specialities,
        languages: languages.length > 0 ? languages : ['en'],
        tone,
        notes,
    };

    /* An admin may override the generated prompt outright. The builder is a
       starting point, not a cage — tuning a persona should not require a
       deploy, which is the whole reason aiSystemPrompt is a column. */
    const overridePrompt = String(form.get('aiSystemPrompt') ?? '').trim();
    const aiSystemPrompt = overridePrompt || buildSystemPrompt(personaInput);

    const created = await prisma.astrologer.create({
        data: {
            isAI: true,
            // No userId: an AI persona has no account to sign in with.
            displayName,
            bio: bio || null,
            languages: personaInput.languages,
            specialities,
            aiSystemPrompt,
            aiModel: aiModel || null,
            // Live immediately, because an AI persona has nothing to screen —
            // there is no human to verify and no credential to check.
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: adminEmail,
            isAvailable: false,
        },
        select: { id: true, displayName: true },
    });

    // The portrait is optional at creation: a persona with no face is still
    // better than a half-filled form lost to a failed upload.
    let photoWarning: string | null = null;
    const photo = form.get('photo');

    if (photo instanceof File && photo.size > 0) {
        if (photo.size > MAX_BYTES) {
            photoWarning = 'Portrait was over 5 MB and was not saved.';
        } else if (!storageConfigured()) {
            photoWarning = 'Photo storage is not configured here, so the portrait was not saved.';
        } else {
            const result = await uploadProfilePhoto(
                await photo.arrayBuffer(),
                `astrologers/${created.id}`
            );
            if (result.ok) {
                await prisma.astrologer.update({
                    where: { id: created.id },
                    data: {
                        photoPath: result.path,
                        // A pointer, never a signed URL — those die within the
                        // hour while the profile stays live.
                        photoUrl: photoPointer(created.id, result.path),
                    },
                });
            } else {
                photoWarning = result.error;
            }
        }
    }

    return NextResponse.json({
        success: true,
        message: `${created.displayName} created.`,
        astrologer: created,
        photoWarning,
        portraitPrompt: buildPortraitPrompt(personaInput),
    });
}
