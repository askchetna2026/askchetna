'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UpdateNotification.module.css';
import {
    useUpdateCheck,
    checkForUpdates,
    canAutoReload,
    markAutoReloadAttempted,
    isCriticalUpdate,
    updateKey,
    type VersionInfo,
} from '@/lib/updates/versionManager';

/**
 * Brings a session that is running older code up to the current deployment.
 *
 * The apps bundle no web content, so a cold start is always current and there is
 * nothing to install. This only matters for a session held open across a deploy.
 *
 * How insistent it is depends on the size of the jump. A patch or minor bump
 * waits for a moment when nothing is at stake — the app being backgrounded, or
 * coming back to the foreground — because reloading under someone part-way
 * through a clarity question or a birth chart form destroys that work. A major
 * bump may mean the deployment no longer honours what this bundle expects, so it
 * goes in as soon as the user is not actually typing, and cannot be dismissed.
 */

/** Whether a reload right now would interrupt something the user is writing. */
function isUserTyping(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export default function UpdateNotification() {
    const { updateAvailable, dismissed, setDismissed, checking } = useUpdateCheck();
    const [isNative, setIsNative] = useState(false);
    const [pushUpdate, setPushUpdate] = useState<VersionInfo | null>(null);
    const [applying, setApplying] = useState(false);

    // Foreground return fires both visibilitychange and Capacitor's resume, so
    // without this the same reload would be kicked off twice.
    const applyingRef = useRef(false);

    useEffect(() => {
        setIsNative(/AskChetnaApp/.test(navigator.userAgent));

        const onPush = (event: Event) => {
            if (event instanceof CustomEvent && event.detail?.type === 'update') {
                setPushUpdate(event.detail.update as VersionInfo);
            }
        };

        window.addEventListener('push-notification', onPush);
        return () => window.removeEventListener('push-notification', onPush);
    }, []);

    const update = updateAvailable || pushUpdate;
    const critical = update ? isCriticalUpdate(update) : false;

    const apply = useCallback((target: VersionInfo) => {
        const key = updateKey(target);
        if (applyingRef.current || !canAutoReload(key)) return;
        applyingRef.current = true;
        markAutoReloadAttempted(key);
        setApplying(true);
        window.location.reload();
    }, []);

    // Major bump: in as soon as it won't interrupt typing.
    useEffect(() => {
        if (!isNative || !update || !critical) return;

        if (!isUserTyping()) {
            apply(update);
            return;
        }

        // Wait for the field to be left. focusout lands before focus settles, so
        // re-check on the next tick rather than acting on the event itself.
        const onFocusOut = () => {
            setTimeout(() => {
                if (!isUserTyping()) apply(update);
            }, 0);
        };

        document.addEventListener('focusout', onFocusOut);
        return () => document.removeEventListener('focusout', onFocusOut);
    }, [isNative, update, critical, apply]);

    // Patch or minor: only at a point where nothing is at stake.
    useEffect(() => {
        if (!isNative || critical) return;

        let disposed = false;
        const cleanups: Array<() => void> = [];

        // Returning to the foreground: ask the server directly rather than trust
        // the last poll, since the deploy may have landed while we were away.
        const onForeground = async () => {
            if (disposed) return;
            const fresh = await checkForUpdates();
            if (fresh && !disposed) apply(fresh);
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                void onForeground();
            } else if (update) {
                // Backgrounded with a known update: nothing on screen to disturb.
                apply(update);
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

        // The native signal is more dependable than visibilitychange inside a
        // WebView; applyingRef keeps the overlap harmless.
        void import('@capacitor/app')
            .then(({ App }) => App.addListener('resume', () => void onForeground()))
            .then((handle) => {
                if (disposed) void handle.remove();
                else cleanups.push(() => void handle.remove());
            })
            .catch(() => { /* plugin unavailable; visibilitychange still covers it */ });

        return () => {
            disposed = true;
            cleanups.forEach((fn) => fn());
        };
    }, [isNative, update, critical, apply]);

    if (!isNative || !update || checking) return null;
    // A major update is not something the user gets to wave away.
    if (dismissed && !critical) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={styles.wrap}
            >
                <div className={`${styles.panel} ${critical ? styles.critical : ''}`}>
                    <div className={styles.body}>
                        <h3 className={styles.title}>
                            {applying
                                ? 'Updating…'
                                : critical
                                    ? '⚠️ Required update'
                                    : '✨ Update ready'}
                        </h3>
                        <p className={styles.detail}>
                            {applying
                                ? `Loading version ${update.version}.`
                                : critical
                                    ? `Version ${update.version} is needed to keep the app working correctly. It will apply in a moment.`
                                    : `Version ${update.version} installs automatically next time you switch back to the app.`}
                        </p>
                    </div>

                    {!applying && (
                        <div className={styles.actions}>
                            {!critical && (
                                <button
                                    onClick={() => setDismissed(true)}
                                    className={styles.later}
                                >
                                    Later
                                </button>
                            )}
                            <button onClick={() => apply(update)} className={styles.apply}>
                                Update now
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
