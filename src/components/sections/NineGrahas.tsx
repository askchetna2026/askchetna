import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import NavagrahaOrbit from './NavagrahaOrbit';
import styles from './NineGrahas.module.css';

/**
 * The closing band: the nine grahas, and the handoff to a human.
 *
 * The orbit replaced a nine-card grid of glyphs. The grid restated the same
 * nine names the rest of the site already lists and said nothing about what a
 * graha IS; a live orbit says "these are moving, and they were somewhere
 * specific when you were born" without a word of copy.
 */
export default function NineGrahas() {
    return (
        <section className={styles.section}>
            <div className={styles.inner}>
                <h2 className={styles.title}>The Nine Grahas</h2>

                <div className={styles.grid}>
                    <div>
                        <p className={styles.copy}>
                            Every reading begins with where the nine were standing at the
                            moment you arrived — and where they have travelled since. Some
                            questions want a person to walk you through it.
                        </p>
                        <div className={styles.actions}>
                            <Link href="/consult" className={styles.btn}>
                                Meet the Astrologers
                            </Link>
                            <Link href="/chart" className={styles.link}>
                                See your chart <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>

                    <NavagrahaOrbit />
                </div>
            </div>
        </section>
    );
}
