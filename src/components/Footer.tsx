'use client';

import Link from 'next/link';
import styles from './Footer.module.css';
import { Mail, Youtube, Instagram, Facebook } from 'lucide-react';
import GetTheApp from './GetTheApp';

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
                    <GetTheApp />
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
                        <li>
                            <span>Subscribe to our new moon newsletter</span>
                        </li>
                    </ul>
                    <form className={styles.subscribeForm} onSubmit={(e) => e.preventDefault()}>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className={styles.subscribeInput}
                            required
                        />
                        <button type="submit" className={styles.subscribeBtn} aria-label="Subscribe">
                            →
                        </button>
                    </form>
                    {/* Legal Links embedded below connect */}
                    <div className={styles.legalSubNav}>
                        <Link href="/disclaimer">Disclaimer</Link>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/terms">Terms</Link>
                        <Link href="/contact">Contact</Link>
                    </div>
                </div>

                {/* LOGO */}
                <div className={`${styles.footerSection} ${styles.logoSection}`}>
                    <div className={styles.monogramLogo}>
                        {/* Circular text logo placeholder */}
                        <svg viewBox="0 0 100 100" width="120" height="120" className={styles.monogramSvg}>
                            <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none" />
                            <text className={styles.monogramText}>
                                <textPath href="#circlePath" startOffset="0%">
                                    ASKCHETNA • ASTROLOGY FOR AWARENESS •
                                </textPath>
                            </text>
                            <circle cx="50" cy="50" r="8" fill="#a34828" />
                        </svg>
                    </div>
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
