'use client';

import { getClientAppPlatform } from '@/lib/platform';

/**
 * Apple In-App Purchase via RevenueCat, for the iOS app only.
 *
 * App Store guideline 3.1.1 requires IAP for digital content consumed in the
 * app, and AskChetna credits are exactly that — so on iOS the Razorpay flow is
 * replaced by this. Web and Android are untouched.
 *
 * Credits are NOT granted from the client. A successful purchase here only means
 * StoreKit accepted the payment; the credits arrive when RevenueCat's verified
 * webhook reaches /api/payment/iap/revenuecat-webhook. Trusting a client-side
 * "purchase succeeded" would be trivially forgeable.
 *
 * Behind dynamic imports throughout, so none of this reaches the web bundle.
 */

export type PurchaseOutcome =
    | { status: 'purchased'; productId: string }
    | { status: 'cancelled' }
    | { status: 'unavailable'; message: string }
    | { status: 'error'; message: string };

function isIosApp(): boolean {
    return getClientAppPlatform() === 'ios';
}

/** Whether the IAP path should be used at all. */
export function isIapAvailable(): boolean {
    return isIosApp();
}

let configured = false;

/**
 * Configure RevenueCat and bind the SDK to our user id.
 *
 * The logIn call is critical: it sets app_user_id, which the webhook uses to
 * decide whose account to credit. Without it RevenueCat generates an anonymous
 * id and the webhook cannot attribute the payment (it logs loudly and grants
 * nothing).
 */
export async function configureIap(userId: string): Promise<boolean> {
    if (!isIosApp()) return false;

    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
    if (!apiKey) {
        console.error('[iap] NEXT_PUBLIC_REVENUECAT_IOS_KEY is not set.');
        return false;
    }

    try {
        const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');

        if (!configured) {
            await Purchases.setLogLevel({
                level: process.env.NODE_ENV === 'production' ? LOG_LEVEL.ERROR : LOG_LEVEL.DEBUG,
            });
            await Purchases.configure({ apiKey, appUserID: userId });
            configured = true;
        } else {
            // Account switched within one app session.
            await Purchases.logIn({ appUserID: userId });
        }

        return true;
    } catch (error) {
        console.error('[iap] configure failed:', error);
        return false;
    }
}

export interface IapProduct {
    productId: string;
    /** Localised, currency-formatted price string from the App Store. */
    priceString: string;
    title: string;
}

/**
 * Fetch the App Store products for the given identifiers.
 *
 * Prices must be shown exactly as the store reports them — Apple rejects apps
 * that display a price differing from the one StoreKit will charge, which is why
 * the INR figure on PricingPlan is never rendered on iOS.
 */
export async function getIapProducts(productIds: string[]): Promise<IapProduct[]> {
    if (!isIosApp() || productIds.length === 0) return [];

    try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const { products } = await Purchases.getProducts({ productIdentifiers: productIds });

        return products.map((product) => ({
            productId: product.identifier,
            priceString: product.priceString,
            title: product.title,
        }));
    } catch (error) {
        console.error('[iap] product fetch failed:', error);
        return [];
    }
}

/**
 * Present the native purchase sheet.
 *
 * Resolving with 'purchased' means StoreKit took the payment, NOT that credits
 * exist yet — the caller should tell the user credits are being applied and
 * refresh, rather than claiming the balance is already updated.
 */
export async function purchaseIapProduct(productId: string): Promise<PurchaseOutcome> {
    if (!isIosApp()) {
        return { status: 'unavailable', message: 'In-app purchase is only available in the iOS app.' };
    }

    try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');

        const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
        if (products.length === 0) {
            return {
                status: 'unavailable',
                message: 'This pack is not available right now. Please try again later.',
            };
        }

        await Purchases.purchaseStoreProduct({ product: products[0] });
        return { status: 'purchased', productId };
    } catch (error) {
        const err = error as { code?: string; message?: string; userCancelled?: boolean };

        // Cancelling is a normal outcome, not an error to surface.
        if (err.userCancelled || err.code === '1' || /cancel/i.test(err.message ?? '')) {
            return { status: 'cancelled' };
        }

        console.error('[iap] purchase failed:', error);
        return {
            status: 'error',
            message: err.message || 'The purchase could not be completed.',
        };
    }
}

/**
 * Re-sync entitlements with the App Store.
 *
 * Apple requires a restore affordance for any app selling IAP. It also recovers
 * the case where a purchase succeeded but the webhook was delayed, by prompting
 * RevenueCat to resend.
 */
export async function restoreIapPurchases(): Promise<boolean> {
    if (!isIosApp()) return false;

    try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        await Purchases.restorePurchases();
        return true;
    } catch (error) {
        console.error('[iap] restore failed:', error);
        return false;
    }
}
