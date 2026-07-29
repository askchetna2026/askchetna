/**
 * Store listing URLs.
 *
 * Placeholders until the apps are published. Kept in environment variables so
 * going live is a Vercel setting rather than a deploy — the listing URLs are
 * not known until the store approves each app, and that approval does not
 * arrive on a schedule anyone controls.
 *
 * NEXT_PUBLIC_ because the links render in the footer and drawer, both client
 * components. There is nothing secret in a store URL.
 */

const PLACEHOLDER_PLAY = 'https://play.google.com/store/apps/details?id=com.askchetnam.app';
const PLACEHOLDER_APPLE = 'https://apps.apple.com/app/askchetna/id000000000';

export const PLAY_STORE_URL =
    process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || PLACEHOLDER_PLAY;

export const APP_STORE_URL =
    process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || PLACEHOLDER_APPLE;

/**
 * Whether a real listing URL has been configured.
 *
 * Lets the UI avoid sending someone to a 404 before launch: with placeholders
 * still in place the download prompt can be softened or hidden rather than
 * promising a store page that does not exist yet.
 */
export const STORE_LINKS_CONFIGURED =
    PLAY_STORE_URL !== PLACEHOLDER_PLAY || APP_STORE_URL !== PLACEHOLDER_APPLE;
