'use client';

import { useUpdateCheck } from '@/lib/updates/versionManager';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  critical: boolean;
  changelog: string;
  releaseDate: string;
}

export default function UpdateNotification() {
  const { updateAvailable, dismissed, setDismissed, checking } = useUpdateCheck();
  const [isNative, setIsNative] = useState(false);
  const [pushUpdate, setPushUpdate] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // Detect if running in native app
    setIsNative(/AskChetnaApp/.test(navigator.userAgent));

    // Listen for push notification events from native app
    const handlePushNotification = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.type === 'update') {
        setPushUpdate(event.detail.update);
        setDismissed(false);
      }
    };

    window.addEventListener('push-notification', handlePushNotification);
    return () => window.removeEventListener('push-notification', handlePushNotification);
  }, [setDismissed]);

  // Show if either updateAvailable (from polling) or pushUpdate (from notification) is present
  const update = updateAvailable || pushUpdate;
  if (!isNative || !update || dismissed || checking) {
    return null;
  }

  const handleRefresh = () => {
    // Force page reload to get latest code
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Dismiss for 24 hours
    localStorage.setItem(
      'updateDismissedUntil',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 p-4"
      >
        <div
          className={`rounded-lg shadow-lg p-4 ${
            update.critical
              ? 'bg-gradient-to-r from-red-900/80 to-red-800/80 border border-red-600/50'
              : 'bg-gradient-to-r from-blue-900/80 to-blue-800/80 border border-blue-600/50'
          } backdrop-blur-md`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">
                {update.critical
                  ? '⚠️ Critical Update Available'
                  : '✨ Update Available'}
              </h3>
              <p className="text-sm text-gray-200 mb-2">
                Version {update.version}
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {update.changelog}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Released: {new Date(update.releaseDate).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              {!update.critical && (
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Later
                </button>
              )}
              <button
                onClick={handleRefresh}
                className={`px-4 py-2 text-xs font-semibold rounded text-white transition-all ${
                  update.critical
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {update.critical ? 'Update Now' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
