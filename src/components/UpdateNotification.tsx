'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useUpdateCheck,
    checkForUpdates,
    canAutoReload,
    markAutoReloadAttempted,
    isCriticalUpdate,
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

    const apply = useCallback((version: string) => {
        if (applyingRef.current || !canAutoReload(version)) return;
        applyingRef.current = true;
        markAutoReloadAttempted(version);
        setApplying(true);
        window.location.reload();
    }, []);

    // Major bump: in as soon as it won't interrupt typing.
    useEffect(() => {
        if (!isNative || !update || !critical) return;

        if (!isUserTyping()) {
            apply(update.version);
            return;
        }

        // Wait for the field to be left. focusout lands before focus settles, so
        // re-check on the next tick rather than acting on the event itself.
        const onFocusOut = () => {
            setTimeout(() => {
                if (!isUserTyping()) apply(update.version);
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
            if (fresh && !disposed) apply(fresh.version);
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                void onForeground();
            } else if (update) {
                // Backgrounded with a known update: nothing on screen to disturb.
                apply(update.version);
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
                className="fixed top-0 left-0 right-0 z-50 p-4"
            >
                <div
                    className={`rounded-lg shadow-lg p-4 backdrop-blur-md ${critical
                        ? 'bg-gradient-to-r from-amber-900/80 to-amber-800/80 border border-amber-500/50'
                        : 'bg-gradient-to-r from-blue-900/80 to-blue-800/80 border border-blue-600/50'
                        }`}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">
                                {applying
                                    ? 'Updating…'
                                    : critical
                                        ? '⚠️ Required update'
                                        : '✨ Update ready'}
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {applying
                                    ? `Loading version ${update.version}.`
                                    : critical
                                        ? `Version ${update.version} is needed to keep the app working correctly. It will apply in a moment.`
                                        : `Version ${update.version} installs automatically next time you switch back to the app.`}
                            </p>
                        </div>

                        {!applying && (
                            <div className="flex gap-2 flex-shrink-0">
                                {!critical && (
                                    <button
                                        onClick={() => setDismissed(true)}
                                        className="px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                                    >
                                        Later
                                    </button>
                                )}
                                <button
                                    onClick={() => apply(update.version)}
                                    className={`px-4 py-2 text-xs font-semibold rounded text-white transition-all ${critical ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                                        }`}
                                >
                                    Update now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
