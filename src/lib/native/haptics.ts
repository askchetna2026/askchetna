'use client';

import { isClientNativeApp } from '@/lib/platform';

/**
 * Haptic feedback for the native apps.
 *
 * A webview cannot vibrate meaningfully — `navigator.vibrate` is unavailable on
 * iOS entirely and feels like a buzzing phone rather than UI feedback on Android.
 * These wrap the platform haptic engines, which is what makes a tap feel
 * acknowledged rather than laggy.
 *
 * Every function is a no-op on the web and never throws: haptics are a nicety,
 * and a missing vibration must never interrupt the action it accompanies.
 *
 * Used sparingly on purpose. Constant buzzing is worse than none, so these are
 * reserved for committing an action and for its result.
 */

/** Light tap — a button press was registered. */
export async function tapFeedback(): Promise<void> {
    if (!isClientNativeApp()) return;
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* haptics unavailable — ignore */ }
}

/** Firmer tap — a consequential action was committed (spending a credit, etc.). */
export async function commitFeedback(): Promise<void> {
    if (!isClientNativeApp()) return;
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch { /* ignore */ }
}

/** Something completed successfully — a reading finished, a purchase landed. */
export async function successFeedback(): Promise<void> {
    if (!isClientNativeApp()) return;
    try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        await Haptics.notification({ type: NotificationType.Success });
    } catch { /* ignore */ }
}

/** Something went wrong. Distinct pattern from success, so it reads without looking. */
export async function errorFeedback(): Promise<void> {
    if (!isClientNativeApp()) return;
    try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        await Haptics.notification({ type: NotificationType.Error });
    } catch { /* ignore */ }
}
