'use client';

import { Smartphone } from 'lucide-react';
import { PLAY_STORE_URL, APP_STORE_URL, STORE_LINKS_CONFIGURED } from '@/lib/appStoreLinks';
import styles from './GetTheApp.module.css';

/**
 * Download prompt, shown on the web only.
 *
 * Replaces the "App Info" entry there, which reports the running build version
 * and update state — genuinely useful inside the app, and meaningless to
 * someone in a browser who has no app to update.
 *
 * The store links are environment-configured (see lib/appStoreLinks.ts), so
 * publishing is a Vercel setting rather than a deploy.
 */
export default function GetTheApp({ variant = 'inline' }: { variant?: 'inline' | 'row' }) {
    // Before the apps are published there is nothing to link to. Rendering
    // buttons that lead to a store 404 is worse than saying "not yet" — it
    // reads as a broken site rather than an unreleased app. Setting either
    // NEXT_PUBLIC_PLAY_STORE_URL or NEXT_PUBLIC_APP_STORE_URL flips this on
    // with no deploy.
    if (!STORE_LINKS_CONFIGURED) {
        return (
            <div className={variant === 'row' ? styles.row : styles.inline}>
                <span className={styles.label}>
                    <Smartphone size={16} aria-hidden="true" />
                    Mobile apps coming soon
                </span>
            </div>
        );
    }

    return (
        <div className={variant === 'row' ? styles.row : styles.inline}>
            <span className={styles.label}>
                <Smartphone size={16} aria-hidden="true" />
                Get the app
            </span>
            <div className={styles.links}>
                <a
                    href={PLAY_STORE_URL}
                    className={styles.store}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Google Play
                </a>
                <a
                    href={APP_STORE_URL}
                    className={styles.store}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    App Store
                </a>
            </div>
        </div>
    );
}
