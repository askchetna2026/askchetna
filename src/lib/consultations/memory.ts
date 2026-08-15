import prisma from '@/lib/prisma';

/**
 * What an astrologer remembers about a seeker, across sessions.
 *
 * The shape is a ROLLING SUMMARY per (seeker, astrologer), rewritten once when
 * a session ends — not a replay of prior transcripts. That choice is the whole
 * design:
 *
 *   The reply flow already slices history to the last 20 messages because
 *   context cannot grow without bound. Carrying every prior session verbatim
 *   would reintroduce exactly that problem one level up, and it would be
 *   re-read, and paid for, on every single turn forever. A few hundred words
 *   rewritten per session is a fixed cost that still remembers.
 *
 * It also gives "start a new conversation" something to mean. The offer is a
 * clean transcript, not amnesia — the astrologer still knows who you are, which
 * is the reason to come back to the same one.
 *
 * Human astrologers get the same memory. The only difference is that they read
 * it on their desk instead of being prompted with it.
 */

/** Long enough to be useful, short enough that the cost stays flat. */
const MAX_SUMMARY_CHARS = 1400;

/** How much of the ended session to summarise from. */
const TRANSCRIPT_TURNS = 60;

export async function getConsultationMemory(
    userId: string,
    astrologerId: string
): Promise<{ summary: string; sessionCount: number; lastSessionAt: Date | null } | null> {
    const row = await prisma.consultationMemory.findUnique({
        where: { userId_astrologerId: { userId, astrologerId } },
        select: { summary: true, sessionCount: true, lastSessionAt: true },
    });
    return row ?? null;
}

/**
 * Rewrite the memory for the pairing behind a finished consultation.
 *
 * Deliberately best-effort and never awaited by anything the seeker is waiting
 * on. This runs after a session has already ended and settled; if the model is
 * unreachable the previous memory simply stands, which is a worse memory rather
 * than a broken session. Throwing here would fail an end-session request that
 * has already taken the money and written the earning.
 */
export async function rewriteConsultationMemory(consultationId: string): Promise<void> {
    try {
        const consultation = await prisma.consultation.findUnique({
            where: { id: consultationId },
            select: {
                userId: true,
                astrologerId: true,
                messages: {
                    orderBy: { sentAt: 'asc' },
                    take: TRANSCRIPT_TURNS,
                    select: { senderId: true, body: true },
                },
            },
        });

        if (!consultation) return;

        // A session where nobody said anything has nothing to remember, and
        // summarising it would spend a call to rewrite the notes as themselves.
        if (consultation.messages.length === 0) return;

        const transcript = consultation.messages
            .map(
                (m) =>
                    `${m.senderId === consultation.astrologerId ? 'YOU' : 'SEEKER'}: ${m.body}`
            )
            .join('\n');

        const existing = await getConsultationMemory(
            consultation.userId,
            consultation.astrologerId
        );

        const { rewriteMemorySummary } = await import('@/lib/ai/geminiService');
        const summary = await rewriteMemorySummary({
            previous: existing?.summary ?? '',
            transcript,
        });

        const trimmed = summary.trim().slice(0, MAX_SUMMARY_CHARS);
        if (!trimmed) return;

        await prisma.consultationMemory.upsert({
            where: {
                userId_astrologerId: {
                    userId: consultation.userId,
                    astrologerId: consultation.astrologerId,
                },
            },
            create: {
                userId: consultation.userId,
                astrologerId: consultation.astrologerId,
                summary: trimmed,
                sessionCount: 1,
                lastSessionAt: new Date(),
            },
            update: {
                summary: trimmed,
                sessionCount: { increment: 1 },
                lastSessionAt: new Date(),
            },
        });
    } catch (err) {
        // Logged, not thrown — see the note above.
        console.error('Failed to rewrite consultation memory:', err);
    }
}

/**
 * Forget this pairing.
 *
 * The seeker's control over their own record. Deleting the row rather than
 * blanking the summary means the next session genuinely starts as a first one,
 * sessionCount included.
 */
export async function forgetConsultationMemory(
    userId: string,
    astrologerId: string
): Promise<void> {
    await prisma.consultationMemory.deleteMany({ where: { userId, astrologerId } });
}
