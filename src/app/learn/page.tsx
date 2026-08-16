import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { CURRICULUM } from '@/lib/learn';
import { SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

/**
 * The order the existing material was always meant to be read in.
 *
 * A server component with no auth check anywhere, like /explore — it renders
 * identically for a crawler, a signed-out visitor and a signed-in seeker, which
 * is what lets it prerender.
 */
export const metadata: Metadata = {
    title: `Learn Vedic astrology, in order | ${SITE_NAME}`,
    description:
        'A path through Vedic astrology: what a chart is made of, how timing works, and what the well-known terms actually mean. Start at the beginning or jump to what you need.',
    alternates: { canonical: '/learn' },
};

export default function LearnPage() {
    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Adhyayana · Study</p>
                <h1 className="mystic-text">Learn, in order</h1>
                <p className={styles.standfirst}>
                    Everything here already existed and none of it knew about anything else. This
                    is the order it was meant to be read in — five stages, each assuming only the
                    one before it. Nothing further down is needed to understand what is above it.
                </p>
            </header>

            <ol className={styles.sections}>
                {CURRICULUM.map((section, i) => (
                    <li key={section.level} className={styles.section}>
                        <div className={styles.sectionHead}>
                            {/* Numbered because this genuinely IS a sequence —
                                each stage assumes the one before it. */}
                            <span className={styles.step} aria-hidden="true">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <div>
                                <h2 className={styles.sectionTitle}>{section.title}</h2>
                                <p className={styles.sectionIntro}>{section.intro}</p>
                            </div>
                        </div>

                        <ul className={styles.entries}>
                            {section.entries.map((entry) => (
                                <li key={entry.href} className={styles.entry}>
                                    <Link href={entry.href} className={styles.entryLink}>
                                        {entry.title}
                                    </Link>

                                    <div className={styles.entryMeta}>
                                        {entry.minutes && <span>{entry.minutes} min read</span>}
                                        {/* Said before the click, not after. A
                                            learning path that walks a curious
                                            stranger into a login wall at step
                                            two has lost them. */}
                                        {entry.needsChart && (
                                            <span className={styles.needsChart}>
                                                <Lock size={11} aria-hidden="true" />
                                                Needs your birth details
                                            </span>
                                        )}
                                    </div>

                                    <p className={styles.entryBlurb}>{entry.blurb}</p>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ol>
        </main>
    );
}
