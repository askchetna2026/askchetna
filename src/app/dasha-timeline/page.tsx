import type { Metadata } from 'next';
import SeoLandingPage from '@/components/SeoLandingPage';
import { SEO_LANDING_PAGES, buildSeoLandingMetadata } from '@/lib/seoLandingPages';

const page = SEO_LANDING_PAGES['dasha-timeline'];

export const metadata: Metadata = buildSeoLandingMetadata(page);

export default function DashaTimelinePage() {
    return <SeoLandingPage page={page} />;
}
