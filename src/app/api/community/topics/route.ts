import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const topics = await (prisma as any).topic.findMany({
            include: {
                user: {
                    select: { name: true, image: true }
                },
                _count: {
                    select: { posts: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(topics);
    } catch (error) {
        console.error('Failed to fetch topics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch topics' },
            { status: 500 }
        );
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

        const body = await req.json();
        const { title, content } = body;

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Title and content are required' },
                { status: 400 }
            );
        }

        const topic = await (prisma as any).topic.create({
            data: {
                title,
                content,
                userId: session.user.id
            }
        });

        return NextResponse.json(topic, { status: 201 });
    } catch (error) {
        console.error('Failed to create topic:', error);
        return NextResponse.json(
            { error: 'Failed to create topic' },
            { status: 500 }
        );
    }
}
