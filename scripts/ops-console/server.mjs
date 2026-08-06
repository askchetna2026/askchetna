#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSchema } from './schema-graph.mjs';
import {
    listEnvFiles, describeEnv, countAll, migrateStatus, migrateDeploy, copyAll, commercial,
    listAstrologers, promoteAstrologers, backupTo, validateStructure,
} from './db.mjs';

/**
 * A local operations console for moving data between the three databases.
 *
 * Runs on YOUR machine and nowhere else. That is not caution for its own sake —
 * it is the only arrangement that works. A console deployed to Vercel can reach
 * exactly one database, its own: `.env.preview` and `.env.prod` are files here,
 * not variables there. Making a deployed console reach all three means putting
 * every connection string into the live app's environment, at which point one
 * auth bypass is simultaneous data loss in all three.
 *
 * Bound to loopback, and every API call carries a token minted at startup. The
 * token is what stops any web page you happen to have open from POSTing to
 * localhost and truncating a database: reading it requires the terminal.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.OPS_PORT ?? 4321);

/** Writing here needs the environment's own name typed back. */
const PROTECTED = /prod/i;

const TOKEN = randomBytes(24).toString('hex');
const jobs = new Map();

const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
};

const readBody = (req) =>
    new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (c) => {
            data += c;
            if (data.length > 1e6) reject(new Error('Body too large'));
        });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
    });

/** Guards the destination of anything that writes. */
function checkDestination(destFile, confirm) {
    if (!PROTECTED.test(destFile)) return null;
    if (confirm !== destFile) {
        return `${destFile} is a protected environment. Type its filename exactly to confirm.`;
    }
    return null;
}

/**
 * Two environment files can point at the SAME database. The pooler hostname is
 * identical for every Supabase project, so this is invisible by eye — and a
 * "copy" onto itself truncates the source.
 */
function sameProject(sourceFile, destFile) {
    const a = describeEnv(sourceFile);
    const b = describeEnv(destFile);
    if (a.projectRef && a.projectRef === b.projectRef) {
        return `Both files point at Supabase project ${a.projectRef}. Writing one onto the other would empty it.`;
    }
    return null;
}

/** Runs work in the background and returns a job id the UI can poll. */
function startJob(work) {
    const id = randomBytes(8).toString('hex');
    const job = { id, done: false, error: null, log: [], report: null, startedAt: Date.now() };
    jobs.set(id, job);
    Promise.resolve()
        .then(() => work(job))
        .then((report) => { job.report = report; })
        .catch((error) => { job.error = String(error?.message ?? error); })
        .finally(() => { job.done = true; });
    return id;
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (url.pathname === '/') {
        // The token travels in the URL so the page can pick it up; the page then
        // sends it as a header on every call.
        if (url.searchParams.get('token') !== TOKEN) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('Open the URL printed in your terminal — it carries the session token.');
        }
        const html = readFileSync(join(HERE, 'ui.html'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(html);
    }

    if (!url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });

    // A custom header cannot be set cross-origin without a CORS preflight, and
    // no preflight is answered here — so a hostile page cannot reach these.
    if (req.headers['x-ops-token'] !== TOKEN) return json(res, 403, { error: 'Bad or missing token' });

    try {
        if (url.pathname === '/api/envs' && req.method === 'GET') {
            const { models } = readSchema();
            return json(res, 200, {
                envs: listEnvFiles().map(describeEnv),
                modelCount: models.length,
                protectedPattern: String(PROTECTED),
            });
        }

        if (url.pathname === '/api/counts' && req.method === 'POST') {
            const { envs } = await readBody(req);
            if (!Array.isArray(envs) || envs.length === 0) {
                return json(res, 400, { error: 'Pick at least one environment.' });
            }
            const { order } = readSchema();
            const result = {};
            for (const file of envs) {
                try {
                    result[file] = { ok: true, counts: await countAll(file) };
                } catch (error) {
                    result[file] = { ok: false, error: String(error?.message ?? error) };
                }
            }
            return json(res, 200, { order: order.map((m) => ({ name: m.name, table: m.table })), result });
        }

        if (url.pathname === '/api/validate-structure' && req.method === 'POST') {
            const { a, b } = await readBody(req);
            if (!a || !b) return json(res, 400, { error: 'Pick two environments.' });
            if (a === b) return json(res, 400, { error: 'Pick two different environments.' });
            return json(res, 200, await validateStructure(a, b));
        }

        if (url.pathname === '/api/astrologers' && req.method === 'POST') {
            const { sourceFile, destFile } = await readBody(req);
            if (!sourceFile) return json(res, 400, { error: 'Pick a source.' });
            return json(res, 200, { astrologers: await listAstrologers(sourceFile, destFile) });
        }

        if (url.pathname === '/api/promote' && req.method === 'POST') {
            const { sourceFile, destFile, ids, includePhotos, confirm } = await readBody(req);
            if (!sourceFile || !destFile) return json(res, 400, { error: 'Pick a source and a destination.' });
            if (sourceFile === destFile) return json(res, 400, { error: 'Source and destination are the same.' });
            if (!Array.isArray(ids) || ids.length === 0) return json(res, 400, { error: 'Select at least one astrologer.' });

            const same = sameProject(sourceFile, destFile);
            if (same) return json(res, 400, { error: same });

            const blocked = checkDestination(destFile, confirm);
            if (blocked) return json(res, 403, { error: blocked });

            return json(res, 200, {
                jobId: startJob((job) =>
                    promoteAstrologers({
                        sourceFile, destFile, ids,
                        includePhotos: includePhotos !== false,
                        onProgress: (e) => job.log.push({ at: Date.now(), ...e }),
                    })
                ),
            });
        }

        if (url.pathname === '/api/backup' && req.method === 'POST') {
            const { sourceFile, destFile, confirm } = await readBody(req);
            if (!sourceFile || !destFile) return json(res, 400, { error: 'Pick a source and a destination.' });
            if (sourceFile === destFile) return json(res, 400, { error: 'Source and destination are the same.' });

            const same = sameProject(sourceFile, destFile);
            if (same) return json(res, 400, { error: same });

            // A backup writes a full replace, so the destination is guarded
            // exactly as the replace operation is.
            const blocked = checkDestination(destFile, confirm);
            if (blocked) return json(res, 403, { error: blocked });

            return json(res, 200, {
                jobId: startJob((job) =>
                    backupTo({
                        sourceFile, destFile,
                        onProgress: (e) => job.log.push({ at: Date.now(), ...e }),
                    })
                ),
            });
        }

        if (url.pathname === '/api/commercial' && req.method === 'POST') {
            const { env } = await readBody(req);
            if (!env) return json(res, 400, { error: 'Pick an environment.' });
            return json(res, 200, await commercial(env));
        }

        if (url.pathname === '/api/schema-status' && req.method === 'POST') {
            const { env } = await readBody(req);
            return json(res, 200, await migrateStatus(env));
        }

        if (url.pathname === '/api/apply-schema' && req.method === 'POST') {
            const { env, confirm } = await readBody(req);
            const blocked = checkDestination(env, confirm);
            if (blocked) return json(res, 403, { error: blocked });
            return json(res, 200, await migrateDeploy(env));
        }

        if (url.pathname === '/api/copy' && req.method === 'POST') {
            const { sourceFile, destFile, confirm, dryRun } = await readBody(req);
            if (!sourceFile || !destFile) return json(res, 400, { error: 'Pick a source and a destination.' });
            if (sourceFile === destFile) return json(res, 400, { error: 'Source and destination are the same.' });

            const same = sameProject(sourceFile, destFile);
            if (same) return json(res, 400, { error: same });

            // A dry run writes nothing, so it does not need the confirmation that
            // guards a destructive one.
            const blocked = dryRun ? null : checkDestination(destFile, confirm);
            if (blocked) return json(res, 403, { error: blocked });

            return json(res, 200, {
                jobId: startJob((job) =>
                    copyAll({
                        sourceFile,
                        destFile,
                        dryRun: Boolean(dryRun),
                        onProgress: (e) => job.log.push({ at: Date.now(), ...e }),
                    })
                ),
            });
        }

        if (url.pathname === '/api/job' && req.method === 'GET') {
            const job = jobs.get(url.searchParams.get('id'));
            if (!job) return json(res, 404, { error: 'No such job' });
            return json(res, 200, job);
        }

        return json(res, 404, { error: 'Not found' });
    } catch (error) {
        return json(res, 500, { error: String(error?.message ?? error) });
    }
});

server.listen(PORT, '127.0.0.1', () => {
    const { models } = readSchema();
    console.log('');
    console.log('  AskChetna operations console');
    console.log(`  ${models.length} models read from prisma/schema.prisma`);
    console.log(`  Environments: ${listEnvFiles().join(', ') || 'none found'}`);
    console.log('');
    console.log(`  \x1b[1mhttp://127.0.0.1:${PORT}/?token=${TOKEN}\x1b[0m`);
    console.log('');
    console.log('  Loopback only. The link carries a one-time session token;');
    console.log('  it changes every start and is not valid anywhere else.');
    console.log('  Ctrl+C to stop.');
    console.log('');
});
