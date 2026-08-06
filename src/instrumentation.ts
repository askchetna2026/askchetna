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

    const { reportEnvironment } = await import('@/lib/envCheck');
    reportEnvironment();
}
