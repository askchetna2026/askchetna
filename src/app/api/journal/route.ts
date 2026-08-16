import { NextRequest, NextResponse, after } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { attachJournalContext } from '@/lib/journalContext';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');

        // No date means "the most recent entries", which is what the home
        // widget shows instead of an empty composer. Kept on the same route so
        // the single-day fetch below is untouched.
        if (!date) {
            const limit = Math.min(Number(searchParams.get('limit')) || 3, 20);
            const entries = await prisma.journalEntry.findMany({
                where: { userId: session.user.id },
                orderBy: { date: 'desc' },
                take: limit,
                // Explicit rather than a default SELECT *, so a column added to
                // this model does not start arriving on a preview list. The
                // `transit` blob is small and fixed — four fields naming the
                // dasha that was running — and /journal shows it under each
                // entry, so it is worth its place here.
                select: { id: true, date: true, content: true, transit: true },
            });
            return NextResponse.json({ entries });
        }

        const entry = await prisma.journalEntry.findUnique({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: date,
                },
            },
        });

        return NextResponse.json(entry || { content: '' });
    } catch (error) {
        console.error('Failed to fetch journal entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // requireUser, not auth(): this handler inserts a row with a userId
        // foreign key, and a JWT can outlive the user it names. Without the
        // existence check that surfaces as "Foreign key constraint violated"
        // — a 500 whose message says nothing about the one fix, signing in
        // again. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        // `transit` is deliberately NOT read off the body any more. The column
        // records which dasha was running when this was written, and a client
        // cannot be the authority on that — it is resolved from the seeker's
        // own chart below, after the response has gone.
        const { date, content } = await req.json();

        if (!date || content === undefined) {
            return NextResponse.json({ error: 'Date and content are required' }, { status: 400 });
        }

        const entry = await prisma.journalEntry.upsert({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: date,
                },
            },
            update: { content },
            create: {
                userId: session.user.id,
                date,
                content,
            },
        });

        // Off the request path: someone pressing Save should not wait on a
        // chart read, and if this fails they lose a piece of metadata rather
        // than their writing.
        after(async () => {
            await attachJournalContext(entry.id, session.user.id, date);
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Failed to save journal entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
