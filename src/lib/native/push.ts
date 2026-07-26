'use client';

import { isClientNativeApp, getClientAppPlatform } from '@/lib/platform';

/**
 * Push notification registration and handling for the native apps.
 *
 * Deliberately NOT called at app start. Apple's Human Interface Guidelines (and
 * reviewers) expect the permission prompt to arrive with context, and on iOS the
 * user only ever sees it once — a cold-start prompt gets denied, and that
 * decision is effectively permanent. So `enablePushNotifications()` is wired to a
 * deliberate user action (the notifications toggle in account settings), while
 * `syncExistingRegistration()` runs on load to keep an already-granted token
 * fresh.
 *
 * Every plugin is behind a dynamic import inside a native guard, so browser
 * visitors download none of this.
 */

/** Android 8+ silently drops notifications with no matching channel. */
const CHANNEL_ID = 'askchetna-default';

export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function isPushSupported(): boolean {
    return isClientNativeApp();
}

/**
 * Current permission state, without prompting.
 * Use this to render the settings toggle in the right position.
 */
export async function getPushPermission(): Promise<PushPermission> {
    if (!isClientNativeApp()) return 'unsupported';
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === 'granted') return 'granted';
        if (receive === 'denied') return 'denied';
        return 'prompt';
    } catch {
        return 'unsupported';
    }
}

/**
 * Ask for permission, register with APNs/FCM, and persist the token.
 *
 * Call from a user gesture only. Resolves to the resulting permission state so
 * the caller can explain what happened — notably 'denied', which on iOS means
 * the only way back is the system Settings app.
 */
export async function enablePushNotifications(): Promise<PushPermission> {
    if (!isClientNativeApp()) return 'unsupported';

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const { receive } = await PushNotifications.requestPermissions();
        if (receive !== 'granted') {
            return receive === 'denied' ? 'denied' : 'prompt';
        }

        await ensureAndroidChannel();

        // Resolves when the OS hands back a token, which arrives via the
        // 'registration' listener rather than as a return value.
        await PushNotifications.register();

        return 'granted';
    } catch (error) {
        console.warn('[push] enable failed:', error);
        return 'unsupported';
    }
}

/**
 * Re-register when permission was already granted.
 *
 * Safe to call on every load and on resume: FCM rotates tokens, and a rotated
 * token that we never learn about means delivery silently stops. Does nothing if
 * permission hasn't been granted, so it never triggers a prompt.
 */
export async function syncExistingRegistration(): Promise<void> {
    if (!isClientNativeApp()) return;

    if ((await getPushPermission()) !== 'granted') return;

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await ensureAndroidChannel();
        await PushNotifications.register();
    } catch (error) {
        console.warn('[push] re-registration failed:', error);
    }
}

/** Stop delivery to this device and retire the token server-side. */
export async function disablePushNotifications(token?: string): Promise<void> {
    if (!isClientNativeApp()) return;

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Clears any notifications already sitting in the tray.
        await PushNotifications.removeAllDeliveredNotifications();

        if (token) await unregisterToken(token);

        // Detach listeners so a later re-enable doesn't double-register them.
        await PushNotifications.removeAllListeners();
    } catch (error) {
        console.warn('[push] disable failed:', error);
    }
}

/**
 * Attach the listeners that turn a delivered notification into app behaviour.
 *
 * Returns a cleanup function. Call once from the app shell.
 *
 * @param onNavigate invoked with a site-relative path when a notification is
 *                   tapped, so the caller can route with the Next router.
 */
export async function attachPushListeners(
    onNavigate: (path: string) => void
): Promise<() => void> {
    if (!isClientNativeApp()) return () => { };

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const handles = await Promise.all([
            // Fired after register() succeeds, and again whenever FCM rotates
            // the token — which is exactly why registration is a listener and
            // not a return value.
            PushNotifications.addListener('registration', (tokenData) => {
                void registerToken(tokenData.value);
            }),

            PushNotifications.addListener('registrationError', (error) => {
                console.warn('[push] registration error:', error);
            }),

            // Foreground receipt. iOS shows the banner itself because
            // presentationOptions is set in capacitor.config.ts.
            // Dispatch custom event for update notifications so React components can react.
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.info('[push] received in foreground:', notification.title);

                const type = notification.data?.type;
                if (type === 'update') {
                    const updateData = {
                        type: 'update',
                        update: {
                            version: notification.data?.version || 'unknown',
                            critical: notification.data?.critical === 'true',
                            changelog: notification.body || 'Update available',
                            releaseDate: new Date().toISOString().split('T')[0],
                        },
                    };
                    window.dispatchEvent(new CustomEvent('push-notification', { detail: updateData }));
                }
            }),

            // Tapped — from the tray, or from a cold start.
            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                const path = action.notification.data?.path;
                if (typeof path === 'string' && path.startsWith('/')) {
                    onNavigate(path);
                }
            }),
        ]);

        return () => {
            handles.forEach((handle) => void handle.remove());
        };
    } catch (error) {
        console.warn('[push] listener attach failed:', error);
        return () => { };
    }
}

/** Create the Android notification channel referenced by the server payload. */
async function ensureAndroidChannel(): Promise<void> {
    if (getClientAppPlatform() !== 'android') return;

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.createChannel({
            id: CHANNEL_ID,
            name: 'AskChetna',
            description: 'Timing insights, credit updates and replies',
            importance: 4, // shows a heads-up banner
            visibility: 1, // public on the lock screen
            lights: true,
            lightColor: '#D4AF37',
            vibration: true,
        });
    } catch (error) {
        console.warn('[push] channel creation failed:', error);
    }
}

/** Persist the token against the signed-in user. */
async function registerToken(token: string): Promise<void> {
    try {
        const { App } = await import('@capacitor/app');
        const { Device } = await import('@capacitor/device');

        // Both are optional metadata for support/debugging — never let them
        // block the registration itself.
        let appVersion: string | undefined;
        try {
            appVersion = (await App.getInfo()).version;
        } catch { /* not available on all platforms */ }

        let deviceModel: string | undefined;
        try {
            deviceModel = (await Device.getInfo()).model;
        } catch { /* optional metadata */ }

        const response = await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                platform: getClientAppPlatform(),
                appVersion,
                deviceModel,
            }),
        });

        if (!response.ok) {
            // 401 just means nobody is signed in yet; the next sign-in re-syncs.
            if (response.status !== 401) {
                console.warn('[push] token registration rejected:', response.status);
            }
        }
    } catch (error) {
        console.warn('[push] token registration failed:', error);
    }
}

async function unregisterToken(token: string): Promise<void> {
    try {
        await fetch('/api/notifications/unregister-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
    } catch (error) {
        console.warn('[push] token unregistration failed:', error);
    }
}
