import PricingClient from '@/components/PricingClient';
import prisma from '@/lib/prisma';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import { getAppPlatform } from '@/lib/platform';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
    if (!PAYMENTS_ENABLED) {
        return (
            <div className={styles.container}>
                <div className={styles.infoSection}>
                    <h1 className="mystic-text">Credit Purchases Paused</h1>
                    <p className={styles.subtitle}>{PAYMENTS_PAUSED_MESSAGE}</p>
                </div>
            </div>
        );
    }

    // Detected SERVER-side, not in the browser. App Store reviewers read the
    // rendered HTML, so a client-only check would still ship the Razorpay markup
    // and script tag to iOS. Free to do here: this route is force-dynamic already.
    const platform = await getAppPlatform();
    const isIos = platform === 'ios';

    const plans = await prisma.pricingPlan.findMany({
        where: isIos
            // On iOS only plans wired to an App Store product can be offered.
            // Showing a pack that IAP cannot fulfil would be a dead button.
            ? { isActive: true, appleProductId: { not: null } }
            : { isActive: true },
        orderBy: { price: 'asc' }
    });

    // Structured data describes the web offering and must not advertise INR
    // pricing inside the iOS app, where Apple's price tiers apply instead.
    const pricingSchema = {
        '@context': 'https://schema.org',
        '@type': 'OfferCatalog',
        name: `${SITE_NAME} Pricing`,
        url: absoluteUrl('/pricing'),
        itemListElement: plans.map((plan, index) => ({
            '@type': 'Offer',
            position: index + 1,
            name: plan.name,
            description: plan.description || `${plan.credits} chart-aware reflection credits`,
            price: (plan.price / 100).toFixed(2),
            priceCurrency: plan.currency,
            availability: 'https://schema.org/InStock',
            category: plan.credits === 1 ? 'Single AI reflection' : 'Credit pack',
            url: absoluteUrl('/pricing'),
        })),
    };

    return (
        <>
            {!isIos && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
                />
            )}
            <PricingClient plans={plans} platform={platform} />
        </>
    );
}
