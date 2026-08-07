import type { Metadata } from 'next';
import TodayScreen from './TodayScreen';

/**
 * The native apps' signed-in home.
 *
 * Reached as a rewrite of "/" for app requests carrying a session (see
 * src/proxy.ts); the URL stays "/". Also a real route, gated in `protectedPaths`
 * so a direct hit meets the same auth boundary.
 *
 * This replaces /dashboard as the app's landing screen. /dashboard is a good
 * account page — profiles, credit history, exports, deletion — and a poor home:
 * it opens on administration rather than on anything to read, which is why the
 * app felt like a settings screen with astrology attached. Today opens on the
 * one thing that changed since yesterday and puts the four things worth doing a
 * thumb's reach below it.
 */
export const metadata: Metadata = {
    title: 'Today',
    robots: { index: false, follow: false },
};

export default function TodayPage() {
    return <TodayScreen />;
}
