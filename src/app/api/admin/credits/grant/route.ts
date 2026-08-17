import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';

/**
 * Credits given by an admin, with nobody having asked.
 *
 * The credit-request flow already covers "the seeker asks, the admin approves".
 * This is the other direction — an apology for a failed session, a gift to an
 * early tester, a correction after a payment that half-worked. Before this, the
 * only way to do it was to write rows by hand in Supabase, which leaves a
 * balance nobody can account for.
 *
 * Deliberately mirrors the approval path in
 * /api/admin/credit-requests/[id] rather than inventing a second way to move
 * credits: one CreditPack so the balance is spendable, one CreditTransaction so
 * the ledger explains where it came from. If those two ever diverge, the money
 * numbers stop meaning anything.
 *
 * Every grant names the admin who made it and why. That is the whole point of
 * the feature — a grant with no attribution is indistinguishable from a bug.
 */

/* Not exported: a route module may only export handlers. */
const MAX_CREDITS_PER_GRANT = 500;
const MAX_REASON = 500;

export async function POST(req: NextRequest) {
    const session = await auth();
    const adminEmail = session?.user?.email ?? null;
    if (!(await isAdmin(adminEmail))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { userId?: unknown; credits?: unknown; reason?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const credits = Number(body.credits);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!userId) {
        return NextResponse.json({ error: 'Pick a user first.' }, { status: 400 });
    }
    if (!Number.isInteger(credits) || credits < 1 || credits > MAX_CREDITS_PER_GRANT) {
        return NextResponse.json(
            { error: `Credits must be a whole number between 1 and ${MAX_CREDITS_PER_GRANT}.` },
            { status: 400 }
        );
    }
    /* Required, not optional. An unexplained grant is exactly the row that
       makes a ledger unauditable six months later, and the person who can
       still explain it is the one filling in this form right now. */
    if (!reason) {
        return NextResponse.json(
            { error: 'Give a reason — it is what makes the ledger readable later.' },
            { status: 400 }
        );
    }
    if (reason.length > MAX_REASON) {
        return NextResponse.json(
            { error: `Keep the reason under ${MAX_REASON} characters.` },
            { status: 400 }
        );
    }

    const recipient = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
    });
    if (!recipient) {
        return NextResponse.json({ error: 'No such user.' }, { status: 404 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const pack = await tx.creditPack.create({
                data: {
                    userId: recipient.id,
                    packType: 'ADMIN_DIRECT_GRANT',
                    questionsTotal: credits,
                    questionsUsed: 0,
                    // No payment happened. The marker says so plainly rather
                    // than leaving a blank that reads like missing data.
                    paymentId: `ADMIN_DIRECT_GRANT_${Date.now()}_${recipient.id}`,
                    amount: 0,
                },
            });

            const entry = await tx.creditTransaction.create({
                data: {
                    userId: recipient.id,
                    amount: credits,
                    description: `Admin granted ${credits} credit${credits === 1 ? '' : 's'}`,
                    metadata: {
                        source: 'admin_direct_grant',
                        grantedBy: adminEmail,
                        reason,
                        creditPackId: pack.id,
                    },
                },
            });

            return { pack, entry };
        });

        return NextResponse.json({
            success: true,
            message: `Gave ${credits} credit${credits === 1 ? '' : 's'} to ${recipient.name ?? recipient.email}.`,
            grant: {
                id: result.entry.id,
                userId: recipient.id,
                userName: recipient.name,
                userEmail: recipient.email,
                credits,
                reason,
                grantedBy: adminEmail,
                createdAt: result.entry.createdAt,
            },
        });
    } catch (error) {
        console.error('[admin] direct credit grant failed:', error);
        return NextResponse.json({ error: 'Could not record that grant.' }, { status: 500 });
    }
}

/**
 * Every direct grant, newest first — the record the feature exists to keep.
 *
 * Read off CreditTransaction rather than a new table: the ledger is already the
 * place a credit movement is explained, and a separate audit table would give
 * two answers to "where did this balance come from".
 */
export async function GET() {
    const session = await auth();
    if (!(await isAdmin(session?.user?.email ?? null))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rows = await prisma.creditTransaction.findMany({
            where: { metadata: { path: ['source'], equals: 'admin_direct_grant' } },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({
            grants: rows.map((row) => {
                const meta = (row.metadata ?? {}) as Record<string, unknown>;
                return {
                    id: row.id,
                    userId: row.userId,
                    userName: row.user?.name ?? null,
                    userEmail: row.user?.email ?? null,
                    credits: row.amount,
                    reason: typeof meta.reason === 'string' ? meta.reason : null,
                    grantedBy: typeof meta.grantedBy === 'string' ? meta.grantedBy : null,
                    createdAt: row.createdAt,
                };
            }),
        });
    } catch (error) {
        console.error('[admin] could not list credit grants:', error);
        return NextResponse.json({ error: 'Could not load grants.' }, { status: 500 });
    }
}
