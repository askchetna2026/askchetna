import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

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
                // Explicit rather than a default SELECT *: `transit` is a JSON
                // blob this list never renders, and pulling it per row would
                // make a preview list cost more than the page it sits on.
                select: { id: true, date: true, content: true },
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

        const { date, content, transit } = await req.json();

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
            update: {
                content,
                transit: transit || undefined,
            },
            create: {
                userId: session.user.id,
                date,
                content,
                transit: transit || {},
            },
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Failed to save journal entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
