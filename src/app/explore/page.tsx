import type { Metadata } from 'next';
import Masthead from '@/components/Masthead';
import RashiMedallions from '@/components/sections/RashiMedallions';
import HowItWorks from '@/components/sections/HowItWorks';
import NineGrahas from '@/components/sections/NineGrahas';
import styles from '../page.module.css';

/**
 * What AskChetna is — readable by anyone, signed in or not.
 *
 * These four sections explain the product, and they lived only in the
 * signed-out branch of `/`. The moment someone created an account they lost
 * access to the clearest explanation of the thing they had just joined, with no
 * route left that could show it to them and no URL they could send anyone.
 *
 * A route of its own rather than appending the sections to the logged-in home:
 * that page is already the heaviest surface in the app, this content is read
 * once rather than daily, and a real URL is shareable and indexable in a way
 * that a conditional branch is not.
 *
 * A server component with no auth check anywhere — that absence is the feature.
 * It renders identically for a crawler, a signed-out visitor and a signed-in
 * seeker, which is what makes it statically prerenderable.
 */

export const metadata: Metadata = {
    title: 'Explore AskChetna | Astrology for Awareness',
    description:
        'How AskChetna reads a birth chart: the twelve rashis, the nine grahas, and what "patterns, not predictions" means in practice.',
    alternates: { canonical: '/explore' },
};

export default function ExplorePage() {
    return (
        <main className={styles.main}>
            <Masthead />
            <RashiMedallions />
            <HowItWorks />
            <NineGrahas />
        </main>
    );
}
