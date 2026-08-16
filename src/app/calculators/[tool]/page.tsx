import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QuickCalculator from '@/components/QuickCalculator';
import { CALCULATORS, CALCULATOR_ORDER } from '@/lib/astrology/calculators';
import type { CalculatorTool } from '@/lib/astrology/calculators';
import { SITE_NAME } from '@/lib/site';

type Params = { params: Promise<{ tool: string }> };

/** Three known tools, so all three render statically at build time. */
export function generateStaticParams() {
    return CALCULATOR_ORDER.map((tool) => ({ tool }));
}

/**
 * Anything else is a real 404, decided by the router before this file runs.
 *
 * With dynamic params allowed, /calculators/anything rendered the not-found
 * body under a 200 — a soft 404, which search engines index as a thin page
 * rather than dropping. There are exactly three tools and there is no reason
 * for a fourth URL to resolve at all.
 */
export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { tool } = await params;
    const content = CALCULATORS[tool as CalculatorTool];
    if (!content) return {};

    return {
        title: `${content.searchTitle} | ${SITE_NAME}`,
        description: content.metaDescription,
        alternates: { canonical: `/calculators/${content.slug}` },
        openGraph: {
            title: content.searchTitle,
            description: content.metaDescription,
        },
    };
}

export default async function CalculatorPage({ params }: Params) {
    const { tool } = await params;
    const content = CALCULATORS[tool as CalculatorTool];
    if (!content) notFound();

    return <QuickCalculator content={content} />;
}
