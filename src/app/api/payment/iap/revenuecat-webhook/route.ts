import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { grantCreditPack } from '@/lib/credits';

/**
 * RevenueCat webhook — grants credits for a completed Apple In-App Purchase.
 *
 * Why RevenueCat sits in the middle rather than us validating receipts:
 * Apple's App Store Server API v2 returns signed JWS payloads whose x5c
 * certificate chain has to be verified against Apple's root CAs, with separate
 * sandbox and production paths. RevenueCat does that verification and calls us
 * only for purchases Apple confirmed. That is why grantCreditPack is invoked
 * with validateAmount: false here — the integrity guarantee is the verified
 * receipt, not a price comparison, and Apple's USD price tiers will never equal
 * the INR figure stored on PricingPlan.
 *
 * Configure in the RevenueCat dashboard:
 *   URL:           https://askchetna.com/api/payment/iap/revenuecat-webhook
 *   Authorization: the exact value of REVENUECAT_WEBHOOK_SECRET
 *
 * The app must call Purchases.logIn(<our user id>) so app_user_id is our
 * User.id — see src/lib/native/iap.ts.
 */

/** Event types that represent a one-off credit pack purchase. */
const CREDIT_GRANTING_EVENTS = new Set([
    'NON_RENEWING_PURCHASE', // consumable / non-renewing — what credit packs are
    'INITIAL_PURCHASE',      // defensive: covers a pack mis-modelled as a subscription
]);

export async function POST(req: NextRequest) {
    try {
        const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
        if (!expectedSecret) {
            console.error('REVENUECAT_WEBHOOK_SECRET is not configured.');
            return NextResponse.json({ error: 'Webhook configuration missing' }, { status: 500 });
        }

        // RevenueCat sends the shared secret verbatim in Authorization. Compared
        // in constant time; length is equalised first because timingSafeEqual
        // throws on a length mismatch, which would itself leak the length.
        const provided = req.headers.get('authorization') ?? '';
        const providedHash = crypto.createHash('sha256').update(provided).digest();
        const expectedHash = crypto.createHash('sha256').update(expectedSecret).digest();
        if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const event = payload?.event;

        if (!event || typeof event !== 'object') {
            return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
        }

        const eventType: string | undefined = event.type;

        // Acknowledge everything else with 200. Returning non-2xx makes
        // RevenueCat retry with backoff, and we genuinely do not care about
        // TEST, TRANSFER, EXPIRATION and friends.
        if (!eventType || !CREDIT_GRANTING_EVENTS.has(eventType)) {
            return NextResponse.json({ success: true, ignored: eventType ?? 'unknown' });
        }

        const userId: string | undefined = event.app_user_id;
        const productId: string | undefined = event.product_id;
        // Apple's transaction id — stable across RevenueCat redeliveries, which
        // is what makes grantCreditPack's dedupe work.
        const transactionId: string | undefined =
            event.transaction_id || event.original_transaction_id || event.id;

        if (!userId || !productId || !transactionId) {
            console.error('RevenueCat event missing required fields:', {
                hasUserId: !!userId, hasProductId: !!productId, hasTransactionId: !!transactionId,
            });
            return NextResponse.json({ error: 'Missing event fields' }, { status: 400 });
        }

        // Anonymous RevenueCat ids mean the app never called logIn(), so we have
        // no idea who paid. Surface loudly: this is lost revenue that needs
        // manual reconciliation, not something to retry.
        if (userId.startsWith('$RCAnonymousID:')) {
            console.error(
                `RevenueCat purchase from an anonymous app_user_id (${userId}), product ${productId}, ` +
                `transaction ${transactionId}. Credits NOT granted — the app must call ` +
                `Purchases.logIn() with our user id before purchasing.`
            );
            return NextResponse.json({ success: true, warning: 'anonymous_user' });
        }

        // Explicit product -> plan mapping (see PricingPlan.appleProductId).
        const plan = await prisma.pricingPlan.findUnique({
            where: { appleProductId: productId },
            select: { key: true },
        });

        if (!plan) {
            console.error(
                `No PricingPlan has appleProductId "${productId}". The customer has PAID and ` +
                `received nothing — set appleProductId on the matching plan, then replay this ` +
                `event from the RevenueCat dashboard.`
            );
            return NextResponse.json({ error: 'Unmapped product' }, { status: 400 });
        }

        const result = await grantCreditPack({
            userId,
            planKey: plan.key,
            paymentId: transactionId,
            // Apple reports price in the customer's currency; recorded as minor
            // units for consistency with the Razorpay rows.
            amount: Math.round((event.price ?? 0) * 100),
            currency: event.currency ?? 'USD',
            source: 'apple_iap',
            // See the note at the top of this file.
            validateAmount: false,
            intent: event.subscriber_attributes?.intent?.value,
            headers: req.headers,
            extraMetadata: {
                appleProductId: productId,
                revenueCatEventType: eventType,
                store: event.store ?? null,
                environment: event.environment ?? null,
            },
            analyticsPath: '/api/payment/iap/revenuecat-webhook',
        });

        if (result.status === 'duplicate') {
            return NextResponse.json({ success: true, note: 'Duplicate' });
        }

        if (result.status === 'error') {
            // 4xx so RevenueCat surfaces the failure in its dashboard rather
            // than silently dropping a paid purchase.
            console.error('IAP credit grant failed:', result.error);
            return NextResponse.json({ error: result.error }, { status: result.httpStatus });
        }

        return NextResponse.json({ success: true, credits: result.credits });
    } catch (error) {
        console.error('RevenueCat webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
