'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useUpdateCheck,
    checkForUpdates,
    canAutoReload,
    markAutoReloadAttempted,
    type VersionInfo,
} from '@/lib/updates/versionManager';

/**
 * Brings a session that is running older code up to the current deployment.
 *
 * The apps bundle no web content, so a cold start is always current and there is
 * nothing to install. This only matters for a session held open across a deploy.
 *
 * The reload is automatic but never immediate while the app is in use: pulling
 * the page out from under someone mid-way through a clarity question or a birth
 * chart form destroys that work. It waits for a point where nothing is at stake
 * — the app being backgrounded, or coming back to the foreground — which is also
 * the moment a user reads as "the app updated itself". The button is for anyone
 * who would rather not wait.
 */
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

    const apply = useCallback((version: string) => {
        if (applyingRef.current || !canAutoReload(version)) return;
        applyingRef.current = true;
        markAutoReloadAttempted(version);
        setApplying(true);
        window.location.reload();
    }, []);

    useEffect(() => {
        if (!isNative) return;

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
    }, [isNative, update, apply]);

    if (!isNative || !update || dismissed || checking) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-0 left-0 right-0 z-50 p-4"
            >
                <div className="rounded-lg shadow-lg p-4 bg-gradient-to-r from-blue-900/80 to-blue-800/80 border border-blue-600/50 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">
                                {applying ? 'Updating…' : '✨ Update ready'}
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {applying
                                    ? `Loading version ${update.version}.`
                                    : `Version ${update.version} installs automatically next time you switch back to the app.`}
                            </p>
                        </div>

                        {!applying && (
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    Later
                                </button>
                                <button
                                    onClick={() => apply(update.version)}
                                    className="px-4 py-2 text-xs font-semibold rounded text-white bg-blue-600 hover:bg-blue-500 transition-all"
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
