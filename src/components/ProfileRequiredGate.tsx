'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/context/ProfileContext';
import { getProfiles } from '@/lib/profileStore';

/**
 * Everything below the "Me" tab, plus the routes a seeker must always be able
 * to reach. A gate that can trap someone on a screen with no way to sign out,
 * read the terms or delete their account is a compliance problem, not just an
 * annoying one — account deletion has to stay reachable (App Store 5.1.1(v)).
 */
const ALWAYS_ALLOWED = [
    '/dashboard', '/account', '/app-info', '/pricing',   // the "Me" half
    '/login', '/onboarding', '/offline',
    '/privacy', '/terms', '/disclaimer', '/refund', '/contact', '/about',
];

/** The home page is its own case: prompt on arrival, but cancelling leaves you there. */
const HOME = '/';

function isAllowed(pathname: string) {
    return ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Keeps asking for a birth profile until there is one.
 *
 * The rule, as asked for:
 *   - no profile, on any page but home and the "Me" half -> ask, and cancelling
 *     returns you to home. Navigating back out asks again.
 *   - no profile, on home -> ask once. Cancelling leaves the home content
 *     visible, and does not ask again until you navigate somewhere else.
 *
 * Cancellation is deliberately NOT remembered across page loads. "Unless a
 * profile is created" is the condition in the requirement, so a refresh asks
 * again; nothing about the app works without a chart.
 *
 * Nothing renders — this is behaviour only. The drawer itself already lives in
 * the layout via ProfileManager, so the gate just decides when to open it.
 */
export default function ProfileRequiredGate() {
    const { status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const { isDrawerOpen, openNewProfileModal } = useProfile();

    const [hasProfile, setHasProfile] = useState<boolean | null>(null);
    const dismissedOnHome = useRef(false);
    const drawerWasOpen = useRef(false);

    // Who they are decides everything below, so re-read on sign-in/out and
    // whenever the drawer closes (which is when a profile may have appeared).
    useEffect(() => {
        // No reset to null when signed out: setting state synchronously in an
        // effect body is what react-hooks/set-state-in-effect flags, and every
        // reader below already gates on `status` first, so a stale value from a
        // previous session is never acted on. Signing in re-runs this and
        // overwrites it.
        if (status !== 'authenticated' || isDrawerOpen) return;

        let cancelled = false;
        (async () => {
            try {
                const data = await getProfiles();
                if (!cancelled && data) setHasProfile((data.profiles?.length ?? 0) > 0);
            } catch {
                // Offline or a blip: say nothing rather than gate someone out of
                // the app because one request failed.
                if (!cancelled) setHasProfile(true);
            }
        })();
        return () => { cancelled = true; };
    }, [status, isDrawerOpen]);

    // Closing the drawer while still profile-less is a cancel. On a gated page
    // that means "show me the home page instead"; on home it means "leave me be".
    useEffect(() => {
        const justClosed = drawerWasOpen.current && !isDrawerOpen;
        drawerWasOpen.current = isDrawerOpen;
        if (!justClosed || hasProfile !== false) return;

        if (pathname === HOME) {
            dismissedOnHome.current = true;
        } else if (!isAllowed(pathname)) {
            router.replace(HOME);
        }
    }, [isDrawerOpen, hasProfile, pathname, router]);

    // Moving to a new page re-arms the prompt: cancelling once should not buy
    // silence everywhere for the rest of the session.
    useEffect(() => {
        if (pathname !== HOME) dismissedOnHome.current = false;
    }, [pathname]);

    useEffect(() => {
        if (status !== 'authenticated' || hasProfile !== false) return;
        if (isDrawerOpen || isAllowed(pathname)) return;
        if (pathname === HOME && dismissedOnHome.current) return;

        void openNewProfileModal();
    }, [status, hasProfile, pathname, isDrawerOpen, openNewProfileModal]);

    return null;
}
