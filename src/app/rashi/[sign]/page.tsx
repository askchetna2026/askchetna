import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';
import { RASHIS, rashiBySlug, rashiArt } from '@/lib/rashis';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import styles from './page.module.css';

type Params = { params: Promise<{ sign: string }> };

/** Twelve known signs, so all twelve render statically at build time. */
export function generateStaticParams() {
    return RASHIS.map((r) => ({ sign: r.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { sign } = await params;
    const rashi = rashiBySlug(sign);
    if (!rashi) return {};

    const title = `${rashi.sa} (${rashi.en}) in Vedic Astrology | ${SITE_NAME}`;
    const description = `${rashi.trait} What the ${rashi.sa} rashi describes, its ruling graha ${rashi.ruler}, and how it shows up as a pattern rather than a prediction.`;

    return {
        title,
        description,
        alternates: { canonical: `/rashi/${rashi.slug}` },
        openGraph: {
            title,
            description,
            url: absoluteUrl(`/rashi/${rashi.slug}`),
            images: [absoluteUrl(rashiArt(rashi))],
        },
    };
}

export default async function RashiPage({ params }: Params) {
    const { sign } = await params;
    const rashi = rashiBySlug(sign);
    if (!rashi) notFound();

    const index = RASHIS.findIndex((r) => r.slug === rashi.slug);
    const prev = RASHIS[(index - 1 + RASHIS.length) % RASHIS.length];
    const next = RASHIS[(index + 1) % RASHIS.length];

    return (
        <div className={styles.page}>
            <Link href="/#rashis" className={styles.back}>
                <ArrowLeft size={16} /> All twelve rashis
            </Link>

            <header className={styles.hero}>
                <div className={styles.art}>
                    <Image
                        src={rashiArt(rashi)}
                        alt={`${rashi.sa} (${rashi.en}) medallion illustration`}
                        width={320}
                        height={320}
                        priority
                    />
                </div>

                <div className={styles.heroText}>
                    <span className="cosmic-label">❋ Rashi {index + 1} of 12 ❋</span>
                    <h1 className={styles.title}>{rashi.sa}</h1>
                    <p className={styles.english}>{rashi.en} · {rashi.symbol}</p>
                    <p className={styles.trait}>{rashi.trait}</p>
                </div>
            </header>

            <dl className={styles.attributes}>
                <div><dt>Ruling graha</dt><dd>{rashi.ruler}</dd></div>
                <div><dt>Tattva</dt><dd>{rashi.element}</dd></div>
                <div><dt>Quality</dt><dd>{rashi.quality}</dd></div>
                <div><dt>Symbol</dt><dd>{rashi.symbol}</dd></div>
            </dl>

            <section className={`${styles.body} sacred-card`}>
                <h2 className={styles.h2}>What {rashi.sa} describes</h2>
                <p>{rashi.about}</p>

                <p className={styles.caveat}>
                    This is the archetype on its own. It is not a reading. Where {rashi.sa}
                    {' '}actually shows up for you — and how strongly — depends on which houses
                    it governs in your chart and which grahas sit in it. Two people with the
                    same rashi emphasised can look nothing alike.
                </p>
            </section>

            <div className={styles.ctas}>
                <Link href="/chart" className="primary-btn-cosmic">
                    See it in your chart <ArrowRight size={16} />
                </Link>
                <Link href="/clarity" className="secondary-btn-cosmic">
                    <MessageSquare size={16} /> Ask about {rashi.sa}
                </Link>
            </div>

            <nav className={styles.pager} aria-label="Other rashis">
                <Link href={`/rashi/${prev.slug}`} className={styles.pagerLink}>
                    <ArrowLeft size={14} />
                    <span>
                        <small>Previous</small>
                        {prev.sa}
                    </span>
                </Link>
                <Link href={`/rashi/${next.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                    <span>
                        <small>Next</small>
                        {next.sa}
                    </span>
                    <ArrowRight size={14} />
                </Link>
            </nav>
        </div>
    );
}
