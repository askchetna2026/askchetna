import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Offline | AskChetna',
    description: 'You are currently offline.',
    robots: { index: false, follow: false },
};

/**
 * Offline fallback, precached by public/sw.js and served when a navigation
 * fails with no network.
 *
 * Two constraints shape this file:
 *
 *   1. It must render correctly with NOTHING else in the cache, so all styling
 *      is inlined rather than imported from a CSS module — a cache miss on
 *      /_next/static/css/*.css would otherwise leave an unstyled page at
 *      exactly the moment we're trying to look polished.
 *   2. The retry affordance uses a plain inline script instead of React state,
 *      so it works without waiting on (or even having) hydration chunks.
 *
 * Colours are hardcoded from the dark theme in globals.css for the same reason.
 */
export default function OfflinePage() {
    return (
        <>
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        .ac-offline{min-height:70vh;display:flex;flex-direction:column;align-items:center;
                            justify-content:center;text-align:center;padding:80px 24px;gap:16px;
                            font-family:var(--font-main,system-ui,-apple-system,sans-serif)}
                        .ac-offline__glyph{font-size:3rem;color:var(--accent-gold);opacity:.9;line-height:1}
                        .ac-offline__title{font-family:var(--font-heading,Georgia,serif);font-size:1.9rem;
                            color:var(--foreground,var(--foreground));margin:0}
                        .ac-offline__text{color:var(--secondary,rgba(223,224,255,.7));font-size:1.05rem;
                            line-height:1.6;max-width:460px;margin:0}
                        .ac-offline__actions{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:12px}
                        .ac-offline__btn{display:inline-flex;align-items:center;padding:12px 28px;border-radius:50px;
                            border:1px solid rgba(181, 137, 46,.45);color:var(--accent-gold);background:transparent;
                            font:inherit;font-weight:600;cursor:pointer;transition:all .25s ease}
                        .ac-offline__btn:hover{background:rgba(181, 137, 46,.12)}
                        .ac-offline__hint{font-size:.9rem;color:var(--secondary,rgba(223,224,255,.55));margin:4px 0 0}
                    `,
                }}
            />
            <main className="ac-offline">
                <span className="ac-offline__glyph" aria-hidden="true">
                    ✦
                </span>
                <h1 className="ac-offline__title">The sky is out of reach</h1>
                <p className="ac-offline__text">
                    You&apos;re offline, so we can&apos;t reach your chart right now. Your saved
                    profiles and insights are safe — they&apos;ll be here the moment you reconnect.
                </p>
                <div className="ac-offline__actions">
                    <button type="button" className="ac-offline__btn" id="ac-offline-retry">
                        Try Again
                    </button>
                </div>
                <p className="ac-offline__hint">This page will reload automatically when you&apos;re back online.</p>
            </main>
            <script
                dangerouslySetInnerHTML={{
                    __html: `(function(){
                        var b=document.getElementById('ac-offline-retry');
                        function retry(){location.reload();}
                        if(b)b.addEventListener('click',retry);
                        window.addEventListener('online',retry);
                    })();`,
                }}
            />
        </>
    );
}
