'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

/**
 * The landing pages' main button, which stops saying "Sign Up" once you have.
 *
 * These pages are server-rendered and their calls to action were fixed strings
 * — so a signed-in seeker browsing /relationship-astrology was invited to
 * "Sign Up for Relationship Insight", and one on /career-astrology to sign up
 * for Career Clarity. Someone already inside the product being asked to join
 * it does not read as a marketing message; it reads as the app not knowing who
 * they are.
 *
 * The destination is taken from the callbackUrl the signup link already
 * carries, so there is exactly one place each page's real target is written
 * down and no second list to fall out of step with the first.
 */
export default function LandingCta({
    href,
    label,
    signedInLabel,
    className,
}: {
    /** The signed-out link, e.g. /login?mode=signup&callbackUrl=/synastry */
    href: string;
    label: string;
    /** What the button says once they are signed in. */
    signedInLabel: string;
    className?: string;
}) {
    const { status } = useSession();

    // Only relative callbacks are honoured. These strings are ours today, but a
    // CTA that will follow whatever a URL tells it to is the kind of thing that
    // becomes an open redirect the moment one of them is made editable.
    const destination = (() => {
        try {
            const query = href.split('?')[1] ?? '';
            const callback = new URLSearchParams(query).get('callbackUrl');
            return callback && callback.startsWith('/') && !callback.startsWith('//')
                ? callback
                : null;
        } catch {
            return null;
        }
    })();

    // While the session is still resolving, show the signed-out wording: it is
    // correct for every visitor who has not signed in, which on a landing page
    // is nearly all of them, and it never flashes the wrong thing at a stranger.
    const signedIn = status === 'authenticated' && destination !== null;

    return (
        <Link href={signedIn ? destination : href} className={className}>
            {signedIn ? signedInLabel : label}
        </Link>
    );
}
