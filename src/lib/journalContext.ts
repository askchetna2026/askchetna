import prisma from '@/lib/prisma';
import type { ChartData } from '@/lib/astrology/calculator';

/**
 * What the sky was doing on the day an entry was written.
 *
 * The whole claim of this product is patterns rather than predictions, and a
 * pattern is something you can only see by comparing what was said about a
 * period against what the period was actually like. A journal that stores only
 * the text cannot support that comparison later: by the time someone wants to
 * ask "what was running when I kept writing this?", the dasha has moved on and
 * the answer is no longer recoverable from the entry.
 *
 * JournalEntry has carried a `transit Json?` column since it was created,
 * described as "capture transit data for that day". Nothing ever wrote to it —
 * neither the home widget nor /today sent the field, so every entry to date has
 * a null there. This fills it.
 *
 * Computed on the server rather than accepted from the client, even though the
 * route already had a `transit` parameter that would have taken it. The client
 * cannot be the authority on where Saturn is, and an entry's astrological
 * context is exactly the kind of field that is worthless if it can be set by
 * whoever is posting.
 */

export interface JournalContext {
    /** Mahadasha lord running on the entry's date. */
    dashaLord: string | null;
    /** Antardasha lord running on the entry's date. */
    antardashaLord: string | null;
    /** Which profile this was read from, so a later reader knows whose. */
    profileId: string | null;
    /** ISO date the context was resolved for — the entry's own day. */
    forDate: string;
}

interface DashaPeriod {
    lord: string;
    start: string;
    end: string;
    antardashas?: DashaPeriod[];
}

/** The period covering `at`, by date rather than by the stored isCurrent flag. */
function periodCovering(periods: DashaPeriod[] | undefined, at: Date): DashaPeriod | null {
    if (!Array.isArray(periods)) return null;
    for (const p of periods) {
        const start = new Date(p.start).getTime();
        const end = new Date(p.end).getTime();
        if (Number.isFinite(start) && Number.isFinite(end) && at.getTime() >= start && at.getTime() <= end) {
            return p;
        }
    }
    return null;
}

/**
 * Resolve the context for one entry.
 *
 * Reads `isCurrent` nowhere: that flag was written when the chart was
 * calculated and says what was running THEN. An entry backdated to last year,
 * or simply written after the chart was stored and the antardasha changed,
 * needs the period covering its own date. Comparing dates is the only thing
 * that stays true.
 *
 * Never throws — a journal entry must save whether or not this succeeds.
 */
export async function resolveJournalContext(
    userId: string,
    date: string
): Promise<JournalContext | null> {
    try {
        const at = new Date(`${date}T12:00:00Z`);
        if (!Number.isFinite(at.getTime())) return null;

        const profile = await prisma.profile.findFirst({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'asc' },
            // chartData is a large JSON blob and this is the only column that
            // needs it, so nothing else is dragged along.
            select: { id: true, chartData: true },
        });

        if (!profile?.chartData) return null;

        const chart = profile.chartData as unknown as ChartData;
        const maha = periodCovering(chart.dashas as DashaPeriod[] | undefined, at);
        const antar = periodCovering(maha?.antardashas, at);

        if (!maha) return null;

        return {
            dashaLord: maha.lord ?? null,
            antardashaLord: antar?.lord ?? null,
            profileId: profile.id,
            forDate: date,
        };
    } catch (error) {
        console.error('Could not resolve journal context:', error);
        return null;
    }
}

/**
 * Attach the context to an entry, after the response has gone.
 *
 * Best-effort by design: the entry is already saved by the time this runs, and
 * a failure here costs a piece of metadata rather than someone's writing.
 */
export async function attachJournalContext(
    entryId: string,
    userId: string,
    date: string
): Promise<void> {
    try {
        const context = await resolveJournalContext(userId, date);
        if (!context) return;

        await prisma.journalEntry.updateMany({
            // Scoped to the owner as well as the id: this runs detached from
            // the request, so it re-establishes who it is allowed to touch.
            where: { id: entryId, userId },
            data: { transit: context as unknown as object },
        });
    } catch (error) {
        console.error('Could not attach journal context:', error);
    }
}
