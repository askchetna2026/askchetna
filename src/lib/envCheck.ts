/**
 * Boot-time sanity check on the environment.
 *
 * The failures worth catching here are not "the variable is missing" — those
 * announce themselves. They are the ones where a variable is *present and
 * wrong*, so everything appears configured and fails quietly somewhere else:
 *
 *   - An ANON key sitting in SUPABASE_SERVICE_ROLE_KEY. Storage then returns
 *     empty lists instead of permission errors, so photo upload silently never
 *     works and the bucket looks like it does not exist. This was live in
 *     production and nothing complained.
 *   - DATABASE_URL on port 5432. That is session mode, capped at 15 clients; a
 *     build or a burst of traffic exhausts it as EMAXCONNSESSION, intermittently
 *     and under load, which is the worst time to be debugging it.
 *   - DIRECT_URL missing, which only surfaces the next time someone migrates.
 *
 * Warnings, not a hard exit. A misconfigured storage key should not take the
 * whole site down when the astrology, chart and consultation paths are all
 * still perfectly serviceable — but it should be impossible to miss in the log.
 */

export type EnvProblem = { level: 'error' | 'warn'; message: string };

/** Payload claims only. The signature is not verified and no key is ever logged. */
function keyRole(jwt: string): string | null {
    try {
        const payload = JSON.parse(
            Buffer.from(jwt.split('.')[1], 'base64').toString()
        ) as { role?: string };
        return payload.role ?? null;
    } catch {
        return null;
    }
}

/** A bag of variables. Deliberately not `NodeJS.ProcessEnv`: this only ever
 *  reads keys, and the stricter type forces callers (tests especially) to
 *  supply unrelated fields like NODE_ENV. */
export type EnvBag = Record<string, string | undefined>;

export function checkEnvironment(env: EnvBag = process.env): EnvProblem[] {
    const problems: EnvProblem[] = [];

    // ── Database ──
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) {
        problems.push({ level: 'error', message: 'DATABASE_URL is not set.' });
    } else {
        try {
            const u = new URL(dbUrl);
            if (u.port !== '6543') {
                problems.push({
                    level: 'error',
                    message:
                        `DATABASE_URL uses port ${u.port || '(default)'}, not 6543. Port 5432 is ` +
                        `session mode and caps at 15 clients — expect EMAXCONNSESSION under load.`,
                });
            }
            if (u.searchParams.get('pgbouncer') !== 'true') {
                problems.push({
                    level: 'warn',
                    message: 'DATABASE_URL is missing ?pgbouncer=true, which Prisma needs on the pooled port.',
                });
            }
        } catch {
            problems.push({ level: 'error', message: 'DATABASE_URL is not a valid URL.' });
        }
    }

    if (!env.DIRECT_URL) {
        problems.push({
            level: 'warn',
            message: 'DIRECT_URL is not set, so migrations cannot run against this environment.',
        });
    }

    // ── Auth ──
    if (!env.NEXTAUTH_SECRET && !env.AUTH_SECRET) {
        problems.push({ level: 'error', message: 'Neither NEXTAUTH_SECRET nor AUTH_SECRET is set.' });
    }

    // ── Supabase storage ──
    const storageUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!storageUrl || !serviceKey) {
        const missing = [
            !storageUrl && 'NEXT_PUBLIC_SUPABASE_URL',
            !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
        ].filter(Boolean);
        problems.push({
            level: 'warn',
            message: `${missing.join(' and ')} not set — astrologer photos cannot be stored or served.`,
        });
    } else {
        const role = keyRole(serviceKey);
        if (role !== 'service_role') {
            problems.push({
                level: 'error',
                message:
                    `SUPABASE_SERVICE_ROLE_KEY holds a "${role ?? 'unreadable'}" key, not a ` +
                    `service_role key. Storage reads return empty instead of failing, so photo ` +
                    `upload breaks silently. Copy the service_role key from Supabase → Project ` +
                    `Settings → API.`,
            });
        }
        try {
            const urlRef = new URL(storageUrl).hostname.split('.')[0];
            const dbRef = dbUrl
                ? decodeURIComponent(new URL(dbUrl).username).replace(/^postgres\./, '')
                : null;
            if (dbRef && urlRef && dbRef !== urlRef) {
                problems.push({
                    level: 'error',
                    message:
                        `Storage points at Supabase project ${urlRef} but the database is ${dbRef}. ` +
                        `Photos and rows would live in different projects.`,
                });
            }
        } catch {
            problems.push({ level: 'warn', message: 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL.' });
        }
    }

    // ── AI provider ──
    // Only the SELECTED provider matters; the others being unset is normal.
    const provider = (env.AI_PROVIDER ?? 'gemini').toLowerCase();
    const keyFor: Record<string, string> = {
        gemini: 'GOOGLE_AI_API_KEY',
        openai: 'OPENAI_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        kimi: 'KIMI_API_KEY',
        moonshot: 'KIMI_API_KEY',
    };
    const needed = keyFor[provider];
    if (needed && !env[needed]) {
        problems.push({
            level: 'warn',
            message: `AI_PROVIDER is "${provider}" but ${needed} is not set. Every AI flow will fall through to another provider, or fail.`,
        });
    }

    return problems;
}

/** Prints the findings once, loudly enough to notice in a deploy log. */
export function reportEnvironment(problems: EnvProblem[] = checkEnvironment()): void {
    if (problems.length === 0) {
        console.log('[env] Configuration looks sane.');
        return;
    }
    for (const p of problems) {
        const line = `[env] ${p.level === 'error' ? 'ERROR' : 'warning'}: ${p.message}`;
        if (p.level === 'error') console.error(line);
        else console.warn(line);
    }
}
