import type { Metadata } from 'next';
import AppWelcome from './AppWelcome';

/**
 * The native apps' signed-out home.
 *
 * Reached as a rewrite of "/" for app requests only (see src/proxy.ts), so the
 * URL a user sees stays "/" and the website's marketing homepage is untouched.
 *
 * Why a different screen at all: someone who installed the app has already read
 * the pitch on the store listing. Serving them the web landing page — masthead,
 * twelve rashi medallions, a how-it-works section and nine grahas, four
 * viewports of scrolling before a call to action — asks them to convert twice.
 * Every mobile app worth copying answers this the same way: one screen, one
 * promise, one button, and something live on it that proves the app works
 * before you have signed up for anything.
 */
export const metadata: Metadata = {
    title: 'AskChetna',
    // Belt and braces with robots.ts: this is an app screen, and a second
    // thin homepage in the index would compete with the real one.
    robots: { index: false, follow: false },
};

export default function AppHomePage() {
    return <AppWelcome />;
}
