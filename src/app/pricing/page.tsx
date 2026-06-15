import PricingClient from '@/components/PricingClient';
import prisma from '@/lib/prisma';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
    if (!PAYMENTS_ENABLED) {
        return (
            <div className={styles.container}>
                <div className={styles.infoSection}>
                    <h1 className="mystic-text text-4xl mb-4">Credit Purchases Paused</h1>
                    <p className={styles.subtitle}>{PAYMENTS_PAUSED_MESSAGE}</p>
                </div>
            </div>
        );
    }

    const plans = await prisma.pricingPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' }
    });

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
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
            />
            <PricingClient plans={plans} />
        </>
    );
}
