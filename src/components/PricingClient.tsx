'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import styles from '@/app/pricing/page.module.css';
import { getVisitorId, trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
    getPricingContext,
    isMonetizationIntent,
    resolvePostPurchasePath,
    sanitizeInternalReturnTo,
    type MonetizationIntent,
} from '@/lib/monetization';
import type { AppPlatform } from '@/lib/platform';

declare global {
    interface Window {
        Razorpay: {
            new(options: Record<string, unknown>): {
                open: () => void;
            };
        };
    }
}

interface PricingPlan {
    key: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    credits: number;
    /** Set only for plans purchasable via Apple IAP. Null on web/Android plans. */
    appleProductId?: string | null;
}

interface PricingClientProps {
    plans: PricingPlan[];
    /**
     * Resolved on the SERVER from the User-Agent, so the iOS build never receives
     * Razorpay markup at all — App Store reviewers read rendered HTML, and
     * guideline 3.1.1 forbids any non-IAP purchase path for in-app content.
     */
    platform: AppPlatform;
}

const FAQ_ITEMS = [
    {
        question: 'Do credits expire?',
        answer: 'No. Credit packs can be used at your own pace and do not expire.',
    },
    {
        question: 'Do I need a subscription?',
        answer: 'No. AskChetna uses one-time credit purchases for AI sessions and premium chart unlocks, so people can explore when they need clarity without recurring charges.',
    },
    {
        question: 'What happens after I pay?',
        answer: 'Your credits are added to your account automatically and can be used for chart-aware AI reflection sessions.',
    },
];

function pickRecommendedPlan(plans: PricingPlan[], intent: MonetizationIntent) {
    const byCreditsAsc = [...plans].sort((a, b) => a.credits - b.credits || a.price - b.price);
    const byCreditsDesc = [...byCreditsAsc].reverse();

    switch (intent) {
        case 'clarity':
            return byCreditsAsc.find((plan) => plan.credits >= 5) || byCreditsAsc.find((plan) => plan.credits > 1) || byCreditsAsc[0] || null;
        case 'chart_unlock':
            return byCreditsAsc.find((plan) => plan.credits >= 5) || byCreditsDesc[0] || null;
        case 'report':
            return byCreditsDesc[0] || null;
        case 'profile_expansion':
            return byCreditsAsc.find((plan) => plan.credits >= 50) || byCreditsDesc[0] || null;
        case 'top_up':
        default:
            return byCreditsAsc.find((plan) => plan.credits >= 10) || byCreditsAsc.find((plan) => plan.credits >= 5) || byCreditsAsc[0] || null;
    }
}

function getButtonLabel(plan: PricingPlan, intent: MonetizationIntent) {
    if (plan.credits === 1) {
        return intent === 'clarity' ? 'Resume Questioning' : 'Ask Now';
    }

    if (intent === 'report') {
        return 'Top Up for Report';
    }

    if (intent === 'chart_unlock') {
        return 'Unlock More Charts';
    }

    if (intent === 'profile_expansion') {
        return 'Prepare for Expansion';
    }

    return 'Get Credits';
}

export default function PricingClient({ plans, platform }: PricingClientProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState<string | null>(null);
    const hasTrackedPricingView = useRef(false);

    const isIos = platform === 'ios';

    /** App Store price strings, keyed by product id. Populated on iOS only. */
    const [iapPrices, setIapPrices] = useState<Record<string, string>>({});
    /** Shown after StoreKit accepts payment, while the webhook applies credits. */
    const [iapPending, setIapPending] = useState(false);
    const [iapError, setIapError] = useState('');
    const [restoring, setRestoring] = useState(false);

    const intentParam = searchParams.get('intent');
    const intent = isMonetizationIntent(intentParam) ? intentParam : null;
    const effectiveIntent: MonetizationIntent = intent || 'top_up';
    const source = searchParams.get('source');
    const focus = searchParams.get('focus');
    const returnTo = sanitizeInternalReturnTo(searchParams.get('returnTo'));
    const pricingContext = getPricingContext(effectiveIntent, focus);

    useEffect(() => {
        if (hasTrackedPricingView.current) {
            return;
        }

        hasTrackedPricingView.current = true;

        void trackEvent(ANALYTICS_EVENTS.PRICING_VIEWED, {
            path: `/pricing${typeof window !== 'undefined' ? window.location.search : ''}`,
            metadata: {
                loggedIn: !!session?.user?.id,
                intent: effectiveIntent,
                source,
                focus,
                returnTo,
                plansShown: plans.map((plan) => ({
                    key: plan.key,
                    credits: plan.credits,
                    price: plan.price,
                })),
            },
        });
    }, [effectiveIntent, focus, plans, returnTo, session?.user?.id, source]);

    /**
     * On iOS: bind RevenueCat to our user id, then load real App Store prices.
     *
     * The logIn is what makes app_user_id our User.id, which is how the webhook
     * knows whose account to credit. Prices must come from StoreKit rather than
     * PricingPlan.price — Apple rejects apps displaying a price that differs from
     * what it will charge, and the INR figure is the Razorpay one.
     */
    useEffect(() => {
        if (!isIos) return;
        const userId = session?.user?.id;
        if (!userId) return;

        let cancelled = false;

        void (async () => {
            const iap = await import('@/lib/native/iap');

            if (!(await iap.configureIap(userId)) || cancelled) return;

            const productIds = plans
                .map((plan) => plan.appleProductId)
                .filter((id): id is string => !!id);

            const products = await iap.getIapProducts(productIds);
            if (cancelled) return;

            setIapPrices(
                Object.fromEntries(products.map((product) => [product.productId, product.priceString]))
            );
        })();

        return () => { cancelled = true; };
    }, [isIos, plans, session?.user?.id]);

    const handleRestore = async () => {
        setRestoring(true);
        setIapError('');
        try {
            const iap = await import('@/lib/native/iap');
            await iap.restoreIapPurchases();
            // Any purchase RevenueCat re-reports arrives through the webhook, so
            // just refresh rather than claiming a balance change here.
            router.refresh();
        } finally {
            setRestoring(false);
        }
    };

    const sortedPlans = [...plans].sort((a, b) => a.price - b.price);
    const recommendedPlan = pickRecommendedPlan(sortedPlans, effectiveIntent);

    const handlePurchase = async (plan: PricingPlan) => {
        void trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, {
            path: `/pricing${typeof window !== 'undefined' ? window.location.search : ''}`,
            metadata: {
                planKey: plan.key,
                planName: plan.name,
                credits: plan.credits,
                price: plan.price,
                currency: plan.currency,
                loggedIn: !!session?.user?.id,
                intent: effectiveIntent,
                source,
                focus,
                returnTo,
            },
        });

        if (!session) {
            const callbackUrl = typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`
                : '/pricing';
            router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
            return;
        }

        setLoading(plan.key);

        // ---- iOS: Apple In-App Purchase ----
        // Razorpay is never reached on iOS. Guideline 3.1.1 requires IAP for
        // digital content consumed in the app, and credits are exactly that.
        if (isIos) {
            setIapError('');
            try {
                if (!plan.appleProductId) {
                    setIapError('This pack is not available in the app yet.');
                    return;
                }

                const iap = await import('@/lib/native/iap');
                const outcome = await iap.purchaseIapProduct(plan.appleProductId);

                if (outcome.status === 'cancelled') return;

                if (outcome.status !== 'purchased') {
                    setIapError(outcome.message);
                    return;
                }

                // StoreKit took the payment, but credits are granted by
                // RevenueCat's verified webhook — never client-side, which would
                // be forgeable. Tell the truth about the delay.
                setIapPending(true);
                router.refresh();
            } catch (error) {
                console.error('IAP error:', error);
                setIapError('The purchase could not be completed. Please try again.');
            } finally {
                setLoading(null);
            }
            return;
        }

        try {
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productKey: plan.key,
                    productName: plan.name,
                    visitorId: getVisitorId(),
                    intent: effectiveIntent,
                    source,
                    focus,
                    returnTo,
                }),
            });

            const order = await response.json();

            if (!response.ok) {
                throw new Error(order.error || 'Failed to create order');
            }

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'AskChetna',
                description: plan.name,
                order_id: order.orderId,
                handler: function () {
                    router.push(resolvePostPurchasePath(effectiveIntent, returnTo));
                    router.refresh();
                },
                prefill: {
                    email: session.user?.email || '',
                    name: session.user?.name || '',
                },
                theme: {
                    color: 'var(--accent-gold-text)',
                },
                modal: {
                    ondismiss: function () {
                        setLoading(null);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <>
            {/* Razorpay's script is not even loaded on iOS. */}
            {!isIos && <Script src="https://checkout.razorpay.com/v1/checkout.js" />}

            <div className={styles.container}>
                <div className={styles.header}>
                    <span className="cosmic-label mb-2 block">Value & Exchange Â· Dana</span>
                    <h1 className="mystic-text text-5xl mb-4">Sacred Exchange</h1>
                    <div className="sacred-divider mb-8"></div>
                    <p className={styles.subtitle}>
                        AskChetna follows a simple and transparent pricing model. You pay only for what you choose to explore - no subscriptions, no pressure.
                    </p>
                </div>

                <div className={styles.contextBanner}>
                    <div>
                        <span className={styles.contextBadge}>{pricingContext.badge}</span>
                        <h2 className={styles.contextTitle}>{pricingContext.title}</h2>
                        <p className={styles.contextText}>{pricingContext.description}</p>
                        <p className={styles.contextRecommendation}>{pricingContext.recommendation}</p>
                    </div>
                    <div className={styles.contextActions}>
                        {returnTo && (
                            <Link href={returnTo} className={styles.secondaryLink}>
                                Return to your flow
                            </Link>
                        )}
                    </div>
                </div>

                {iapPending && (
                    <div className={styles.noteBox}>
                        <p>
                            <strong>Payment received.</strong> Your credits are being added and
                            will appear in a moment. You can close and reopen this screen if they
                            haven&apos;t shown up.
                        </p>
                    </div>
                )}

                {iapError && (
                    <div className={styles.noteBox}>
                        <p><strong>{iapError}</strong></p>
                    </div>
                )}

                <div className={styles.pricingGrid}>
                    {sortedPlans.map((plan) => {
                        const isRecommended = plan.key === recommendedPlan?.key;
                        return (
                            <div key={plan.key} className={`${styles.priceCard} ${isRecommended ? styles.featured : ''} sacred-card`}>
                                <div className={styles.cardLabel}>
                                    {isRecommended ? 'Recommended Next Step' : plan.credits === 1 ? 'Single Question' : 'Credit Pack'}
                                </div>
                                {/* On iOS show the App Store's own localised price
                                    string. Displaying the INR Razorpay figure there
                                    would differ from what StoreKit charges, which
                                    Apple rejects. */}
                                <div className={styles.price}>
                                    {isIos
                                        ? (plan.appleProductId && iapPrices[plan.appleProductId]) || '—'
                                        : `₹${plan.price / 100}`}
                                </div>
                                <div className={styles.priceUnit}>
                                    {plan.credits === 1 ? 'per question' : `${plan.credits} questions`}
                                </div>
                                {isRecommended && (
                                    <p className={styles.recommendedNote}>
                                        Best fit for your current goal.
                                    </p>
                                )}
                                <ul className={styles.features}>
                                    {plan.description && <li>{plan.description}</li>}
                                    {plan.credits > 1 ? (
                                        <>
                                            <li>Use at your own pace</li>
                                            <li>No expiry date</li>
                                            <li>Return straight to your current flow after checkout</li>
                                        </>
                                    ) : (
                                        <>
                                            <li>Chart-aware guidance</li>
                                            <li>No predictions</li>
                                        </>
                                    )}
                                </ul>
                                <button
                                    onClick={() => handlePurchase(plan)}
                                    className="primary-btn-cosmic w-full"
                                    disabled={loading === plan.key}
                                >
                                    {loading === plan.key ? 'Processing...' : getButtonLabel(plan, effectiveIntent)}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Apple requires a restore affordance in any app selling IAP
                    (guideline 3.1.1). It also recovers a purchase whose webhook
                    was delayed, by prompting RevenueCat to resend. */}
                {isIos && (
                    <div className={styles.infoSection}>
                        <button
                            onClick={handleRestore}
                            className={styles.secondaryLink}
                            disabled={restoring}
                        >
                            {restoring ? 'Restoring…' : 'Restore Purchases'}
                        </button>
                    </div>
                )}

                <div className={styles.infoSection}>
                    <h2 className="mystic-text text-2xl mb-4">What You&apos;re Paying For</h2>
                    <ul>
                        <li>Structured astrological interpretation</li>
                        <li>AI-assisted reflection and guidance</li>
                        <li>Ethical safeguards and clarity-first design</li>
                        <li>Pattern-based insights aligned with your chart</li>
                    </ul>
                </div>

                <div className={styles.infoSection}>
                    <h2 className="mystic-text text-2xl mb-4">You Are NOT Paying For</h2>
                    <ul>
                        <li>Fortune-telling or predictions</li>
                        <li>Emergency answers or urgent decisions</li>
                        <li>Absolute certainties or guarantees</li>
                        <li>Dependency-creating models</li>
                    </ul>
                </div>

                <div className={styles.noteBox}>
                    <p>
                        <strong>A Gentle Reminder:</strong> AskChetna encourages thoughtful use. More questions do not mean better answers - clarity comes from reflection and action.
                    </p>
                </div>

                <div className={styles.infoSection}>
                    <h2 className="mystic-text text-2xl mb-4">Frequently Asked Questions</h2>
                    <ul>
                        {FAQ_ITEMS.map((item) => (
                            <li key={item.question}>
                                <strong>{item.question}</strong> {item.answer}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}
