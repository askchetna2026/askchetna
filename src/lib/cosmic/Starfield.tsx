'use client';

import { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { isClientNativeApp } from '@/lib/platform';

/**
 * Gate in front of the WebGL starfield.
 *
 * The canvas draws 10,000 stars with antialias, dpr up to 2 and
 * powerPreference: 'high-performance'. That is a fair trade for a landing page
 * someone looks at for thirty seconds; it is a different proposition inside an
 * app they keep open for twenty minutes, where it costs battery the whole time.
 * CSS cannot help — display:none still leaves the render loop running, so the
 * canvas has to not mount at all.
 *
 * Loaded through next/dynamic so three.js is a separate chunk that native
 * clients never request, saving the download as well as the GPU time.
 *
 * useSyncExternalStore rather than useState + useEffect: the server has no
 * navigator, so this value genuinely differs between server and client. The
 * server snapshot is false and React uses it for SSR and the hydration pass,
 * then re-reads on the client — which is the documented way to render something
 * client-only without a mismatch, and without assigning state from an effect.
 *
 * The CSS layers in globals.css (.stars-layer-1/2, portal glow, noise) stay in
 * both cases — they are static backgrounds with no animation loop.
 */

const StarfieldCanvas = dynamic(() => import('./StarfieldCanvas'), { ssr: false });

/** No external store to watch: the answer cannot change without a reload. */
const neverChanges = () => () => {};

const shouldRender = () =>
    !isClientNativeApp() &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const notOnTheServer = () => false;

export function CosmicStarfield() {
    const enabled = useSyncExternalStore(neverChanges, shouldRender, notOnTheServer);

    if (!enabled) return null;
    return <StarfieldCanvas />;
}
