import { NextRequest, NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { resolveJournalContext } from '@/lib/journalContext';

/**
 * What a seeker has chosen to keep.
 *
 * This replaces a localStorage key that was written to and never read: /clarity
 * has had a "Save this response" button for months which stored the answer
 * under `chetna-saved-insights` and showed it nowhere, on one device only.
 *
 * Server-side because the whole value is being able to come back to it — from
 * the phone as well as the laptop, next month as well as this evening. A saved
 * thing that a cleared cache destroys was not really saved.
 */

const MAX_TITLE = 200;
const MAX_BODY = 20_000;
const MAX_LIST = 100;

/** Only surfaces that exist, so a bad client cannot invent categories. */
const SOURCES = new Set(['clarity', 'patterns', 'timing', 'chart', 'consultation']);

export async function GET(req: NextRequest) {
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, MAX_LIST);

    const insights = await prisma.savedInsight.findMany({
        where: { userId: authed.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            source: true,
            href: true,
            title: true,
            body: true,
            context: true,
            createdAt: true,
        },
    });

    return NextResponse.json({ insights });
}

export async function POST(req: NextRequest) {
    // requireUser, not auth(): this inserts a row with a userId foreign key.
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    let body: { source?: unknown; title?: unknown; body?: unknown; href?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const source = typeof body.source === 'string' ? body.source : '';
    if (!SOURCES.has(source)) {
        return NextResponse.json({ error: 'Unknown source' }, { status: 400 });
    }

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
    const text = typeof body.body === 'string' ? body.body.trim().slice(0, MAX_BODY) : '';

    if (!title || !text) {
        return NextResponse.json({ error: 'Nothing to save' }, { status: 400 });
    }

    // Relative paths only. An href is rendered as a link on /saved, and taking
    // an absolute URL from the body would let a saved item point anywhere.
    const rawHref = typeof body.href === 'string' ? body.href : '';
    const href = rawHref.startsWith('/') && !rawHref.startsWith('//') ? rawHref.slice(0, 500) : null;

    const insight = await prisma.savedInsight.create({
        data: { userId: authed.userId, source, title, body: text, href },
        select: { id: true, createdAt: true },
    });

    // The dasha running right now, so this can be read later against the period
    // it belonged to. Off the request path — someone pressing Save should not
    // wait on a chart read, and losing the context costs a line of metadata.
    after(async () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const context = await resolveJournalContext(authed.userId, today);
            if (!context) return;
            await prisma.savedInsight.updateMany({
                where: { id: insight.id, userId: authed.userId },
                data: { context: context as unknown as object },
            });
        } catch (error) {
            console.error('Could not attach insight context:', error);
        }
    });

    return NextResponse.json({ insight });
}
