import Link from 'next/link';
import ImageSlot from '@/components/art/ImageSlot';
import { RASHIS, rashiArt } from '@/lib/rashis';
import styles from './RashiMedallions.module.css';

/**
 * The twelve rashis as illustrated medallions, each linking to its own page.
 *
 * Replaces the scrolling glyph ticker: same twelve signs, image-led, and every
 * card is now a destination rather than decoration — twelve medallions that do
 * nothing are just ornament, and on a phone a tappable card is the expected
 * affordance.
 *
 * Copy is deliberately archetypal and carries no dates, no daily reading and no
 * outcome. Sun-sign horoscopes are tropical Western, which is the wrong system
 * here, and they are also the exact deterministic-prediction surface the product
 * positioning avoids. Data lives in @/lib/rashis so this grid and the detail
 * pages cannot drift apart.
 */
export default function RashiMedallions() {
    return (
        <section className={styles.section} id="daily-guidance">
            <div className={styles.header}>
                <span className="cosmic-label">❋ Daily Guidance ❋</span>
                <h2 className="mystic-text">Daily Guidance</h2>
                <div className="sacred-divider"></div>
                <p className={styles.intro}>
                    Twelve archetypal patterns, calculated for self-awareness. Select your sidereal sign to explore today&apos;s reflection.
                </p>
            </div>

            <div className={styles.grid}>
                {RASHIS.map((rashi) => (
                    <Link
                        key={rashi.slug}
                        href={`/rashi/${rashi.slug}`}
                        className={`${styles.card} sacred-card`}
                    >
                        <div className={styles.medallion}>
                            <ImageSlot
                                src={rashiArt(rashi)}
                                slot={rashiArt(rashi)}
                                alt={`${rashi.sa} (${rashi.en}) medallion illustration`}
                                ratio="1/1"
                                width={300}
                            />
                        </div>

                        <h3 className={styles.name}>{rashi.sa}</h3>
                        <div className={styles.englishRow}>
                            <span className={styles.english}>{rashi.en}</span>
                            <span className={styles.dotSeparator}>•</span>
                            <span className={styles.dateRange}>{rashi.dateRange}</span>
                        </div>

                        <p className={styles.dailyQuote}>&ldquo;{rashi.dailyQuote}&rdquo;</p>

                        <span className={styles.actionBtn}>
                            Read Guidance →
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
