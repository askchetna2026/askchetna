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
 * `bare` strips the site header and footer too, and is the SIGNED-OUT welcome
 * screen only.
 *
 * Today keeps both, deliberately. Hiding the header there looked better and
 * broke the app: the drawer is the only route to Relationships, Blog, Credits,
 * Dashboard, App Info and sign-out, and the "Me" tab goes to /account, which
 * links onward to none of them. Until those move into a real "Me" screen, the
 * header is Today's only navigation and it stays.
 *
 * The welcome screen has no such problem — it offers one action, and it is
 * budgeted to exactly one viewport, where the header's ~80px and the footer's
 * 117px are the difference between the button sitting above the tab bar and
 * below it.
 */
export default function AppScreenChrome({ bare = false }: { bare?: boolean }) {
    useEffect(() => {
        const root = document.documentElement;
        const classes = ['app-home-screen', ...(bare ? ['app-home-bare'] : [])];
        root.classList.add(...classes);
        return () => root.classList.remove(...classes);
    }, [bare]);

    return null;
}
