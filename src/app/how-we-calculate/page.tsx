import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'How We Calculate Your Chart | AskChetna',
    description: 'Transparency on our astrology methodology — the sidereal (Lahiri) ayanamsa, the astronomical engine we use, how we handle unknown birth times, and how we ensure accuracy.',
};

export default function HowWeCalculatePage() {
    return (
        <main className={styles.legalPage}>
            <div className={styles.container}>
                <div className={styles.hero}>
                    <span className="cosmic-label">Transparency · Pramana</span>
                    <h1 className="mystic-text">How We Calculate Your Chart</h1>
                    <div className="sacred-divider"></div>
                    <p className={styles.heroSubtitle}>The science behind the chart — no black boxes.</p>
                </div>

                <section>
                    <h2>The calculation system we use</h2>
                    <p>
                        Your chart is built using the <strong>sidereal zodiac</strong> with the <strong>Lahiri (Chitrapaksha) ayanamsa</strong>,
                        the standard reference used across Vedic astrology. Unlike Western (tropical) astrology, the sidereal
                        zodiac is anchored to the actual observed positions of the constellations in the sky.
                    </p>
                    <p>
                        Planetary positions are computed from established astronomical ephemeris data — the same class of
                        precise positional data used in astronomy — rather than approximations or look-up tables.
                    </p>
                </section>

                <section>
                    <h2>How accuracy is ensured</h2>
                    <ul>
                        <li><strong>Precise coordinates:</strong> Your birth place is geocoded to exact latitude and longitude.</li>
                        <li><strong>Time handling:</strong> Your birth time and date are converted carefully to avoid timezone or date-boundary errors.</li>
                        <li><strong>Divisional charts:</strong> Vargas like the Navamsa (D9) and Dasamsa (D10) are derived mathematically from your base chart positions.</li>
                        <li><strong>Dashas:</strong> Vimshottari Dasha periods are calculated from your Moon&apos;s exact Nakshatra position.</li>
                    </ul>
                </section>

                <section>
                    <h2>What happens if you don&apos;t know your birth time</h2>
                    <p>
                        Birth time mainly affects your Ascendant (Lagna) and the house placements of your planets. If you don&apos;t
                        know your exact time, we default to noon so that planetary signs and the Moon&apos;s position remain meaningful.
                        In that case, treat house-based and Ascendant-based interpretations as approximate — the sign-level and
                        Dasha insights still hold.
                    </p>
                </section>

                <section>
                    <h2>An honest note</h2>
                    <p>
                        Astrology is interpretive, not deterministic. We are precise about the <em>astronomy</em>, and humble about
                        the <em>meaning</em>. Chetna is built for awareness and reflection — see our{' '}
                        <Link href="/disclaimer">approach and disclaimer</Link>.
                    </p>
                </section>

                <div className={styles.backLink}>
                    <Link href="/">← Back to Home</Link>
                </div>
            </div>
        </main>
    );
}
