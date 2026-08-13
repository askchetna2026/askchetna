import type { Prisma } from '@prisma/client';

/**
 * The gate in front of Profile.chartData.
 *
 * Charts arrive from the browser, which means the shape written to the column
 * is whatever a client sends — including clients running older JS than the
 * deployment, which is normal for a Capacitor app pinned to a URL and for any
 * tab left open across a deploy. Two things had got in that way and stayed:
 *
 *  - `transits`, a full chart-for-right-now (its own vargas, its own dasha
 *    tree) that /api/astrology/calculate used to return. Nothing ever read it
 *    back, and it was stale the moment it was written.
 *  - dasha levels below antardasha, a 9-per-level tree that nothing reading
 *    from storage descends into.
 *
 * Together those measured at ~1.5MB average and 7.5MB worst case per profile,
 * against ~35KB of chart that is actually used. The size is not only storage:
 * these rows are sent to the browser and JSON.parsed on every navigation that
 * touches a profile.
 *
 * Both are now avoided at the source, so for a current client this is a no-op.
 * It exists so that a stale client cannot put them back.
 */

/** Levels below mahadasha to keep. Mirrors DASHA_DEPTH_STORED. */
const KEEP_ANTARDASHA_ONLY = 1;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const CHILD_KEYS = ['antardashas', 'pratyantarDashas', 'sookshmaDashas', 'pranaDashas'] as const;

/** Drop pratyantar/sookshma/prana, whichever of them a client sent. */
function trimDashaDepth(periods: unknown, level: number): unknown {
    if (!Array.isArray(periods)) return periods;

    return periods.map((period) => {
        if (!isRecord(period)) return period;

        const child = CHILD_KEYS.map((key) => period[key]).find((value) => value !== undefined);

        const trimmed: UnknownRecord = { ...period };
        for (const key of CHILD_KEYS) delete trimmed[key];

        if (level >= KEEP_ANTARDASHA_ONLY || child === undefined) return trimmed;

        // The surviving level is always written as `antardashas` — it is the
        // only depth kept, so the deeper names never need reproducing.
        trimmed.antardashas = trimDashaDepth(child, level + 1);
        return trimmed;
    });
}

/**
 * Normalise a chart for writing to Profile.chartData.
 *
 * Returns a Prisma-safe JSON value. A null/undefined chart becomes `{}`, which
 * is what the profile routes already stored for "no chart yet" — callers that
 * want to leave an existing value untouched should check before calling.
 */
export function prepareChartForStorage(chart: unknown): Prisma.InputJsonValue {
    if (!isRecord(chart)) return {};

    const prepared: UnknownRecord = { ...chart };
    delete prepared.transits;
    if (prepared.dashas !== undefined) prepared.dashas = trimDashaDepth(prepared.dashas, 0);

    return prepared as Prisma.InputJsonValue;
}
