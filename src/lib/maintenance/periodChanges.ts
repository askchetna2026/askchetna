import prisma from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push/send';
import type { ChartData } from '@/lib/astrology/zodiac';

/**
 * Tell a seeker when one of their planetary periods is about to turn over.
 *
 * The catalogue asks for notifications that are personally relevant rather than
 * broadcast, and this is the clearest example available: a dasha boundary is a
 * date computed from one person's chart, it arrives a handful of times a
 * decade, and there is no other way for them to find out it is coming.
 *
 * TONE. The house rule is explicit that this must not be alarming — "Dangerous
 * planetary period starts today!" is exactly what it forbids. A period turning
 * over is a fact, not a warning, and the copy below says what changes and
 * offers to show the timeline. Nothing about it is urgent.
 *
 * IDEMPOTENCE. The sweep that calls this runs hourly, so without dedup a
 * boundary inside the notice window would fire every hour for days. The
 * dedupeKey is built from the EVENT — user, kind and the boundary date — and
 * inserted BEFORE the push. A crash between the insert and the send costs one
 * missed notice, which is the right way round: a duplicate is far more damaging
 * to trust than a miss.
 */

/** How far ahead of a boundary to say something. */
const NOTICE_WINDOW_DAYS = 3;

/** Kept small: this runs behind a page view. */
const BATCH = 25;

interface DashaNode {
    lord: string;
    start: string;
    end: string;
    antardashas?: DashaNode[];
}

interface UpcomingBoundary {
    kind: 'dasha' | 'antardasha';
    lord: string;
    /** The lord taking over. */
    nextLord: string | null;
    date: string;
}

/** The next boundary inside the notice window, if there is one. */
function boundaryWithin(chart: ChartData, fromMs: number, toMs: number): UpcomingBoundary | null {
    const tree = chart.dashas as DashaNode[] | undefined;
    if (!Array.isArray(tree)) return null;

    for (let i = 0; i < tree.length; i++) {
        const maha = tree[i];
        const end = Date.parse(maha.end);

        if (end >= fromMs && end <= toMs) {
            return {
                kind: 'dasha',
                lord: maha.lord,
                nextLord: tree[i + 1]?.lord ?? null,
                date: new Date(end).toISOString().slice(0, 10),
            };
        }

        const antars = maha.antardashas ?? [];
        for (let j = 0; j < antars.length; j++) {
            const aEnd = Date.parse(antars[j].end);
            if (aEnd >= fromMs && aEnd <= toMs) {
                return {
                    kind: 'antardasha',
                    lord: antars[j].lord,
                    nextLord: antars[j + 1]?.lord ?? tree[i + 1]?.lord ?? null,
                    date: new Date(aEnd).toISOString().slice(0, 10),
                };
            }
        }
    }

    return null;
}

function notice(b: UpcomingBoundary): { title: string; body: string } {
    const when = new Date(b.date + 'T12:00:00Z').toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    });

    if (b.kind === 'dasha') {
        return {
            title: 'A new chapter begins',
            body: b.nextLord
                ? `Your ${b.lord} mahadasha ends on ${when}, and a ${b.nextLord} period takes over.`
                : `Your ${b.lord} mahadasha ends on ${when}.`,
        };
    }

    return {
        title: 'A new sub-period begins',
        body: b.nextLord
            ? `Your ${b.lord} sub-period ends on ${when}, and ${b.nextLord} takes over.`
            : `Your ${b.lord} sub-period ends on ${when}.`,
    };
}

export interface PeriodNoticeResult {
    considered: number;
    sent: number;
}

/**
 * Notify everyone with a boundary coming up who has asked to hear about it.
 *
 * Never throws — this runs behind a page view.
 */
export async function sendPeriodChangeNotices(): Promise<PeriodNoticeResult> {
    const now = Date.now();
    const until = now + NOTICE_WINDOW_DAYS * 86_400_000;

    // Only people who have a device to notify AND have not opted out. The
    // absence of a preference row means never asked, and periodChange defaults
    // to on — so a LEFT JOIN semantic is wanted, not an inner one.
    const candidates = await prisma.user.findMany({
        where: {
            deletionRequestedAt: null,
            deviceTokens: { some: { disabledAt: null } },
            OR: [
                { notificationPreference: null },
                { notificationPreference: { periodChange: true } },
            ],
        },
        select: {
            id: true,
            profiles: {
                where: { isActive: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
                select: { chartData: true },
            },
        },
        take: BATCH,
    });

    let sent = 0;

    for (const user of candidates) {
        try {
            const chart = user.profiles[0]?.chartData as unknown as ChartData | undefined;
            if (!chart) continue;

            const boundary = boundaryWithin(chart, now, until);
            if (!boundary) continue;

            const dedupeKey = `u:${user.id}:${boundary.kind}:${boundary.date}`;

            // Claim BEFORE sending, and let the unique index decide.
            //
            // createMany with skipDuplicates rather than create-in-a-try:
            // catching the constraint works, but Prisma logs every rejection as
            // an error, so the normal case — a notice already sent — filled the
            // log with failures that were the design working. A count of 0 says
            // the same thing quietly.
            const claim = await prisma.notificationSent.createMany({
                data: [{ userId: user.id, dedupeKey, kind: `period:${boundary.kind}` }],
                skipDuplicates: true,
            });
            if (claim.count === 0) continue;

            const { title, body } = notice(boundary);
            await sendPushToUsers([user.id], {
                title,
                body,
                path: '/timing',
                data: { kind: 'period-change', date: boundary.date },
            }).catch((e) => console.error('period notice push failed', user.id, e));

            sent += 1;
        } catch (error) {
            console.error('Period notice failed for a user:', error);
        }
    }

    return { considered: candidates.length, sent };
}
