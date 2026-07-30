import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import { getWelcomeBonusCredits } from '@/lib/welcomeBonus';

/**
 * Generated rather than static so the sign-up grant in the description tracks
 * the configured value. It read "10 free credits" while the setting said 2, and
 * a search snippet advertising a number the product does not honour is worse
 * than one that omits it.
 */
export async function generateMetadata(): Promise<Metadata> {
    const credits = await getWelcomeBonusCredits();
    const description =
        `Simple, transparent credits for ${SITE_NAME}. Start with ${credits} free ` +
        `credit${credits === 1 ? '' : 's'} on signup, then top up Clarity packs as ` +
        'you need them - they never expire.';

    return {
        title: `Pricing & Credits | ${SITE_NAME}`,
        description,
        alternates: {
            canonical: absoluteUrl('/pricing'),
        },
        openGraph: {
            title: `Pricing & Credits | ${SITE_NAME}`,
            description,
            url: absoluteUrl('/pricing'),
            type: 'website',
        },
    };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
