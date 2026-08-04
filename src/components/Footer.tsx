'use client';

import Link from 'next/link';
import styles from './Footer.module.css';
import GetTheApp from './GetTheApp';
import ChetnaMark from './ChetnaMark';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>
                {/* LATEST JOURNALS */}
                <div className={styles.footerSection}>
                    <h3>LATEST JOURNALS</h3>
                    <ul className={styles.footerLinks}>
                        <li><Link href="/blog/alchemy-of-saturn">The Alchemy of Saturn</Link></li>
                        <li><Link href="/blog/ishta-devata">Finding Your Ishta Devata</Link></li>
                        <li><Link href="/blog/venus-12th-house">Venus in the 12th House</Link></li>
                        <li><Link href="/blog" className={styles.readMoreLink}>Read More...</Link></li>
                    </ul>
                </div>

                {/* RESOURCES */}
                <div className={styles.footerSection}>
                    <h3>RESOURCES</h3>
                    <ul className={styles.footerLinks}>
                        <li><Link href="/chart">Cast Your Chart</Link></li>
                        <li><Link href="/aura">Read Your Daily Focus</Link></li>
                        <li><Link href="/synastry">Calculate Compatibility</Link></li>
                        <li><Link href="/consult">Book a Session</Link></li>
                        <li><Link href="/glossary">The Jyotiṣa Glossary</Link></li>
                    </ul>
                    {/* Was butted straight against the last link, so "Mobile apps
                        coming soon" read as a sixth list item. */}
                    <div className={styles.appPrompt}>
                        <GetTheApp />
                    </div>
                </div>

                {/* CONNECT */}
                <div className={styles.footerSection}>
                    <h3>CONNECT</h3>
                    <ul className={styles.footerLinks}>
                        <li>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                Follow us on Instagram
                            </a>
                        </li>
                        <li>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                Join our Telegram community
                            </a>
                        </li>
                    </ul>

                    {/* The newsletter line used to sit in the list above as a
                        bare <span> — it looked like a link, wasn't one, and left
                        the input labelled by placeholder alone. It is the field's
                        label now, which fixes both. */}
                    <form className={styles.subscribe} onSubmit={(e) => e.preventDefault()}>
                        <label className={styles.subscribeLabel} htmlFor="footer-newsletter">
                            Subscribe to our new moon newsletter
                        </label>
                        <div className={styles.subscribeRow}>
                            <input
                                id="footer-newsletter"
                                type="email"
                                placeholder="you@example.com"
                                className={styles.subscribeInput}
                                autoComplete="email"
                                required
                            />
                            <button type="submit" className={styles.subscribeBtn}>
                                Join
                            </button>
                        </div>
                    </form>
                    {/* Legal Links embedded below connect */}
                    <div className={styles.legalSubNav}>
                        <Link href="/disclaimer">Disclaimer</Link>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/terms">Terms</Link>
                        <Link href="/contact">Contact</Link>
                    </div>
                </div>

                {/* LOGO — the real emblem, set as a colophon.
                    Replaced a placeholder that spun "ASKCHETNA • ASTROLOGY FOR
                    AWARENESS •" around a plain dot: not the brand mark, and at
                    11px on a rotating circle the words were unreadable anyway. */}
                <div className={`${styles.footerSection} ${styles.logoSection}`}>
                    <ChetnaMark size={96} className={styles.footerMark} />
                    <div className={styles.footerWordmark}>AskChetna</div>
                    <div className={styles.footerColophon}>Jyotiṣa · Since 2024</div>
                </div>
            </div>

            <div className={styles.footerBottom}>
                <p className={styles.copyright}>
                    © {new Date().getFullYear()} AskChetna. All rights reserved.
                </p>
                <p className={styles.productRule}>
                    Astrology is interpretive, not deterministic.
                </p>
            </div>
        </footer>
    );
}
