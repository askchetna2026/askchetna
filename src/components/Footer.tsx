'use client';

import Link from 'next/link';
import styles from './Footer.module.css';
import { Mail, Youtube, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>
                {/* About Section */}
                <div className={`${styles.footerSection} ${styles.aboutSection}`}>
                    <h3>About AskChetna</h3>
                    <p>
                        An awareness-first astrology platform designed to support reflection, understanding, and conscious decision-making.
                    </p>
                    <div className={styles.socialLinks}>
                        <a href="mailto:hello@askchetna.com" className={styles.socialIcon} aria-label="Email">
                            <Mail size={18} />
                        </a>
                        <a href="#" className={styles.socialIcon} aria-label="YouTube">
                            <Youtube size={18} />
                        </a>
                        <a href="#" className={styles.socialIcon} aria-label="Instagram">
                            <Instagram size={18} />
                        </a>
                        <a href="#" className={styles.socialIcon} aria-label="Facebook">
                            <Facebook size={18} />
                        </a>
                    </div>
                </div>

                {/* Quick Links */}
                <div className={`${styles.footerSection} ${styles.exploreSection}`}>
                    <h3>Explore</h3>
                    <ul className={styles.footerLinks}>
                        <li><Link href="/about">About</Link></li>
                        <li><Link href="/how-it-works">How It Works</Link></li>
                        <li><Link href="/chart">Your Chart</Link></li>
                        <li><Link href="/timing">Timing & Phases</Link></li>
                        <li><Link href="/synastry">Relationships</Link></li>
                        <li><Link href="/blog">Blog</Link></li>
                        <li><Link href="/glossary">Glossary</Link></li>
                        <li><Link href="/clarity">Ask Chetna AI</Link></li>
                    </ul>
                </div>

                {/* Legal Links. Kept in the app's compact footer too — App Store
                    5.1.1 and Play both want these reachable in-app. */}
                <div className={`${styles.footerSection} ${styles.legalSection}`}>
                    <h3>Legal</h3>
                    <ul className={styles.footerLinks}>
                        <li><Link href="/disclaimer">Disclaimer</Link></li>
                        <li><Link href="/privacy">Privacy Policy</Link></li>
                        <li><Link href="/terms">Terms of Service</Link></li>
                        <li><Link href="/refund">Refund Policy</Link></li>
                        <li><Link href="/contact">Contact Us</Link></li>
                    </ul>
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
