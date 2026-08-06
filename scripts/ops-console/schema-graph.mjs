import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * The model list, table names and copy order, DERIVED FROM schema.prisma at
 * runtime.
 *
 * This is the whole reason this module exists. `scripts/supabase-copy-db.js`
 * and `scripts/backup-db.js` each carry a hand-written array of models, and
 * both have drifted: of 33 models they list 20 and 19. Everything missing is
 * the newer work — Astrologer, Consultation, ConsultationMessage,
 * AstrologerEarning, Payout, AstrologerApplication, AstrologerAvailability,
 * Appointment, AppSetting, DeviceToken and the lifecycle tables. A copy run
 * with either script silently drops the entire consultations and payments
 * subsystem and then reports success.
 *
 * A list nobody has to remember to update cannot drift. Add a model to the
 * schema and it appears here on the next run.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `Astrologer` -> `astrologer`, the key on PrismaClient. Prisma lower-cases
 *  only the first character, so `AstrologerEarning` -> `astrologerEarning`. */
export const modelKey = (name) => name.charAt(0).toLowerCase() + name.slice(1);

export function readSchema() {
    const source = readFileSync(join(ROOT, 'prisma', 'schema.prisma'), 'utf8');
    const blocks = [...source.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
    const names = blocks.map((b) => b[1]);

    const models = blocks.map(([, name, body]) => {
        // `@@map` decides the real table name. Nine models use it and twenty-four
        // do not, which is exactly the mix that makes a hand-written list of
        // "table names" wrong for half the schema.
        const mapped = body.match(/@@map\("([^"]+)"\)/);

        // The scalar `@id`, used to paginate a large table by cursor. Composite
        // `@@id` models have no single cursor, so they fall back to offset.
        let idField = null;
        for (const line of body.split('\n')) {
            const m = line.match(/^\s*(\w+)\s+\S+.*@id\b/);
            if (m) { idField = m[1]; break; }
        }

        // Only the side of a relation that HOLDS the foreign key (`fields: [...]`)
        // is a real insert-order dependency. The back-reference is just a view of
        // the same constraint and would invent a cycle if counted.
        const dependsOn = new Set();
        for (const line of body.split('\n')) {
            const m = line.match(/^\s*\w+\s+(\w+)(\[\])?\s*\??\s*@relation\(([^)]*)\)/);
            if (m && /fields:/.test(m[3]) && names.includes(m[1])) dependsOn.add(m[1]);
        }

        return { name, table: mapped ? mapped[1] : name, key: modelKey(name), idField, dependsOn };
    });

    return { models, order: topoSort(models) };
}

/**
 * Parents before children, so an insert never references a row that is not
 * there yet. Reverse the same order to truncate.
 *
 * The schema currently has no cycles and no self-references, but a cycle would
 * be reported rather than silently producing an order that fails halfway
 * through a copy.
 */
function topoSort(models) {
    const byName = new Map(models.map((m) => [m.name, m]));
    const done = new Set();
    const visiting = new Set();
    const order = [];
    const cycles = [];

    const visit = (name, stack) => {
        if (done.has(name)) return;
        if (visiting.has(name)) {
            cycles.push([...stack, name].join(' -> '));
            return;
        }
        visiting.add(name);
        for (const dep of byName.get(name)?.dependsOn ?? []) visit(dep, [...stack, name]);
        visiting.delete(name);
        done.add(name);
        order.push(name);
    };

    for (const m of models) visit(m.name, []);
    if (cycles.length) {
        throw new Error(
            `Circular foreign keys, so there is no safe insert order: ${cycles.join(' | ')}`
        );
    }
    return order.map((n) => byName.get(n));
}
