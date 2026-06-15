import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
    title: `Pricing & Credits | ${SITE_NAME}`,
    description: 'Simple, transparent credits for AskChetna. Start with 10 free credits on signup, then top up Clarity packs as you need them - they never expire.',
    alternates: {
        canonical: absoluteUrl('/pricing'),
    },
    openGraph: {
        title: `Pricing & Credits | ${SITE_NAME}`,
        description: 'Simple, transparent credits for AskChetna. Start with 10 free credits on signup, then top up Clarity packs as you need them - they never expire.',
        url: absoluteUrl('/pricing'),
        type: 'website',
    },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
