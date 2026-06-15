import type { Metadata } from 'next';
import SeoLandingPage from '@/components/SeoLandingPage';
import { SEO_LANDING_PAGES, buildSeoLandingMetadata } from '@/lib/seoLandingPages';

const page = SEO_LANDING_PAGES['career-astrology'];

export const metadata: Metadata = buildSeoLandingMetadata(page);

export default function CareerAstrologyPage() {
    return <SeoLandingPage page={page} />;
}
