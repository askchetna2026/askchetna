'use client';

import { useEffect } from 'react';

/**
 * Marks <html> for as long as one of the app's home screens is mounted.
 *
 * The layout hangs two floating buttons over every page — "Ask Chetna" and
 * "new profile". On the home screens they are wrong twice over: they land on
 * top of the content (on the welcome screen, directly over its only call to
 * action), and they offer destinations those screens already give a full-width
 * tile or a tab to. globals.css hides them under `.app-home-screen`.
 *
 * A class on <html> rather than a pathname check inside each button, because
 * both screens are served at "/" — the same path the website's marketing page
 * uses — so a pathname check would change the website too.
 *
 * `hideFooter` is the welcome screen only. In the app the footer is already one
 * line and 117px tall — `html.native-app` hides every section of it — so it is
 * not the wall of links it is on the web, and Today can carry it. But the
 * welcome screen is budgeted to exactly one viewport, and 117px is precisely
 * the difference between the button sitting above the tab bar and below it.
 */
export default function AppScreenChrome({ hideFooter = false }: { hideFooter?: boolean }) {
    useEffect(() => {
        const root = document.documentElement;
        const classes = ['app-home-screen', ...(hideFooter ? ['app-home-no-footer'] : [])];
        root.classList.add(...classes);
        return () => root.classList.remove(...classes);
    }, [hideFooter]);

    return null;
}
