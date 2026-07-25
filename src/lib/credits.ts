import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { getRequestLocation, recordAnalyticsEvent } from '@/lib/analytics/server';
import { isMonetizationIntent, type MonetizationIntent } from '@/lib/monetization';
import { sendTopUpSuccessLifecycleEmail } from '@/lib/lifecycleEmails';

/**
 * The single path by which credits are ever granted for a purchase.
 *
 * Extracted verbatim from the Razorpay webhook so that Apple In-App Purchase
 * cannot drift from it. Two payment providers granting credits through two
 * separate code paths is how you end up with one of them quietly missing the
 * idempotency guard or the analytics event.
 *
 * Callers:
 *   - src/app/api/payment/webhook/route.ts                  (Razorpay)
 *   - src/app/api/payment/iap/revenuecat-webhook/route.ts   (Apple IAP)
 */

export type PaymentSource = 'razorpay' | 'apple_iap';

export interface GrantCreditPackInput {
    userId: string;
    /** Must match PricingPlan.key. */
    planKey: string;
    /**
     * Provider's unique transaction id. This is the idempotency key — webhooks
     * are retried, and both Razorpay and RevenueCat will redeliver on any
     * non-2xx.
     */
    paymentId: string;
    /** Minor units (paise for INR). Recorded on the CreditPack. */
    amount: number;
    currency: string;
    source: PaymentSource;
    /**
     * Whether `amount`/`currency` must equal the plan's configured price.
     *
     * TRUE for Razorpay: the amount is attacker-influencable, so a mismatch
     * means someone tried to buy a large pack at a small pack's price.
     *
     * FALSE for Apple IAP: StoreKit prices are set per Apple price tier in USD
     * and will never equal the INR figure in PricingPlan. The integrity
     * guarantee there comes from elsewhere — Apple validated the receipt and
     * RevenueCat verified it before calling us — so comparing to an INR price
     * would reject every legitimate purchase.
     */
    validateAmount: boolean;
    visitorId?: string | null;
    intent?: string | null;
    /** Request headers, used only to attach country/city to the analytics event. */
    headers?: Headers;
    /** Provider-specific extras merged into the CreditTransaction metadata. */
    extraMetadata?: Record<string, unknown>;
    /** Path recorded on the analytics event. */
    analyticsPath: string;
}

export type GrantCreditPackResult =
    | { status: 'granted'; credits: number; planName: string }
    | { status: 'duplicate' }
    | { status: 'error'; error: string; httpStatus: number };

export async function grantCreditPack(
    input: GrantCreditPackInput
): Promise<GrantCreditPackResult> {
    const {
        userId, planKey, paymentId, amount, currency, source,
        validateAmount, visitorId, intent, headers, extraMetadata, analyticsPath,
    } = input;

    if (!userId || !planKey || !paymentId) {
        return { status: 'error', error: 'Missing payment metadata', httpStatus: 400 };
    }

    // Idempotency. Webhook redelivery is normal, not exceptional.
    const existingPack = await prisma.creditPack.findFirst({
        where: { paymentId },
    });
    if (existingPack) {
        return { status: 'duplicate' };
    }

    // Explicit select rather than the whole row: this keeps the money path from
    // breaking whenever a column is added to PricingPlan ahead of its migration
    // reaching the database (Prisma otherwise SELECTs every column and fails
    // with P2022).
    const plan = await prisma.pricingPlan.findUnique({
        where: { key: planKey },
        select: { key: true, name: true, credits: true, price: true, currency: true },
    });
    if (!plan) {
        return { status: 'error', error: `Unknown pricing plan: ${planKey}`, httpStatus: 400 };
    }
    if (plan.credits < 1) {
        return {
            status: 'error',
            error: `Pricing plan ${planKey} does not map to a credit pack.`,
            httpStatus: 400,
        };
    }

    if (validateAmount && (amount !== plan.price || currency !== plan.currency)) {
        return {
            status: 'error',
            error: 'Payment amount or currency does not match the pricing plan.',
            httpStatus: 400,
        };
    }

    await prisma.$transaction([
        prisma.creditPack.create({
            data: {
                userId,
                packType: plan.key,
                questionsTotal: plan.credits,
                questionsUsed: 0,
                paymentId,
                amount,
            },
        }),
        prisma.creditTransaction.create({
            data: {
                userId,
                amount: plan.credits,
                description: `Purchased ${plan.name}`,
                metadata: {
                    paymentId,
                    productType: plan.key,
                    planName: plan.name,
                    planCredits: plan.credits,
                    source,
                    ...(extraMetadata ?? {}),
                },
            },
        }),
    ]);

    const location = getRequestLocation(headers ?? new Headers());
    await recordAnalyticsEvent({
        type: ANALYTICS_EVENTS.PAYMENT_SUCCESS,
        path: analyticsPath,
        userId,
        visitorId: visitorId || null,
        country: location.country,
        city: location.city,
        metadata: {
            paymentId,
            planKey: plan.key,
            planName: plan.name,
            credits: plan.credits,
            amount,
            currency,
            source,
            ...(extraMetadata ?? {}),
        },
    });

    const lifecycleIntent: MonetizationIntent | undefined =
        typeof intent === 'string' && isMonetizationIntent(intent) ? intent : undefined;

    // Fire-and-forget: a mail failure must not cause the webhook to return
    // non-2xx, which would make the provider redeliver and re-grant nothing
    // (idempotency holds) while alarming us for no reason.
    void sendTopUpSuccessLifecycleEmail({
        userId,
        paymentId,
        planName: plan.name,
        credits: plan.credits,
        intent: lifecycleIntent,
    }).catch((emailError) => {
        console.error('Top-up lifecycle email failed:', emailError);
    });

    return { status: 'granted', credits: plan.credits, planName: plan.name };
}
