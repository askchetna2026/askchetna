import { describe, it, expect } from 'vitest';
import { prepareChartForStorage } from './chartStorage';

type Rec = Record<string, unknown>;

const rec = (value: unknown): Rec => value as Rec;
const list = (value: unknown): Rec[] => value as Rec[];
/** Names of any surviving child-period arrays on a dasha period. */
const childKeys = (period: Rec): string[] => Object.keys(period).filter((k) => k.endsWith('ashas'));

/** A dasha period with `depth` levels of children below it. */
function period(lord: string, depth: number, childKey = 'antardashas'): Record<string, unknown> {
    const p: Record<string, unknown> = { lord, start: '2020-01-01', end: '2026-01-01', isCurrent: false };
    if (depth > 0) {
        const nextKey =
            childKey === 'antardashas' ? 'pratyantarDashas' :
                childKey === 'pratyantarDashas' ? 'sookshmaDashas' : 'pranaDashas';
        p[childKey] = [period(lord, depth - 1, nextKey)];
    }
    return p;
}

const chart = {
    planets: { Moon: { name: 'Moon', longitude: 12.3 } },
    houses: [0, 30, 60],
    ascendant: 100,
    mc: 10,
    vargas: { D1: { ascendant: 100 } },
};

describe('prepareChartForStorage', () => {
    it('keeps a well-formed chart intact', () => {
        const stored = rec(prepareChartForStorage({ ...chart, dashas: [period('Ketu', 1)] }));
        const maha = list(stored.dashas)[0];

        expect(stored.planets).toEqual(chart.planets);
        expect(stored.vargas).toEqual(chart.vargas);
        expect(stored.ascendant).toBe(100);
        expect(maha.lord).toBe('Ketu');
        expect(list(maha.antardashas)).toHaveLength(1);
    });

    it('drops the transit snapshot a stale client may still send', () => {
        // The key that made stored charts 95% dead weight: a whole second chart
        // for "now", never read back, stale on arrival.
        const stored = rec(prepareChartForStorage({ ...chart, transits: chart }));

        expect('transits' in stored).toBe(false);
        expect(stored.planets).toEqual(chart.planets);
    });

    it('caps the dasha tree at antardasha', () => {
        const stored = rec(prepareChartForStorage({ dashas: [period('Ketu', 3)] }));
        const maha = list(stored.dashas)[0];
        const antar = list(maha.antardashas)[0];

        expect(childKeys(maha)).toEqual(['antardashas']);
        // Nothing below antardasha survives, whatever it was named.
        expect(childKeys(antar)).toEqual([]);
    });

    it('is idempotent — a stored chart round-trips unchanged', () => {
        const once = prepareChartForStorage({ ...chart, transits: chart, dashas: [period('Ketu', 3)] });

        expect(prepareChartForStorage(once)).toEqual(once);
    });

    it('treats a missing or non-object chart as no chart', () => {
        // The profile routes stored `{}` for "not calculated yet"; keep that,
        // because `null` is a distinct state in a nullable Json column.
        expect(prepareChartForStorage(undefined)).toEqual({});
        expect(prepareChartForStorage(null)).toEqual({});
        expect(prepareChartForStorage('not a chart')).toEqual({});
        expect(prepareChartForStorage([1, 2])).toEqual({});
    });

    it('leaves a chart with no dashas alone', () => {
        const stored = rec(prepareChartForStorage(chart));

        expect('dashas' in stored).toBe(false);
        expect(stored.vargas).toEqual(chart.vargas);
    });
});
