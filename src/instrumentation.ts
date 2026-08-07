/**
 * Runs once when a server instance starts.
 *
 * Used only to report on the environment, so a misconfiguration announces
 * itself in the deploy log rather than surfacing later as a request that
 * quietly does the wrong thing.
 *
 * Guarded on the Node runtime: `envCheck` decodes a JWT payload with `Buffer`,
 * which the Edge runtime does not provide, and the proxy runs on the Edge.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    // Swallowed deliberately. This runs on every cold start and produces
    // nothing but diagnostics, so there is no failure here worth taking the
    // site down for — a check meant to make problems visible must not become
    // one. The catch is logged, so a broken checker is not itself invisible.
    try {
        const { reportEnvironment } = await import('@/lib/envCheck');
        reportEnvironment();
    } catch (error) {
        console.error('[env] Startup check failed to run:', error);
    }
}
