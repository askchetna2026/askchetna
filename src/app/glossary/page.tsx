import type { Metadata } from 'next';
import Link from 'next/link';
// From the plain module, NOT from Term.tsx. Term is a client component, and on
// the server its exports are client references rather than values — importing
// GLOSSARY through it made Object.values() below return an empty array, so this
// page shipped with no terms on it at all.
import { GLOSSARY } from '@/lib/glossary';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Astrology Glossary in Plain English | AskChetna',
    description: 'A plain-English glossary of Vedic astrology terms — Ascendant, Dasha, Rahu, Ketu, Nakshatra, Navamsa and more, each explained in two sentences with a real-life example.',
};

export default function GlossaryPage() {
    const entries = Object.values(GLOSSARY);

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <div className={styles.hero}>
                    <span className="cosmic-label">Shabdkosh · Plain English</span>
                    <h1 className="mystic-text">Astrology, in Plain English</h1>
                    <div className="sacred-divider"></div>
                    <p className={styles.subtitle}>
                        No jargon, no gatekeeping. Here&apos;s what the key terms actually mean — and what they look like in real life.
                    </p>
                </div>

                <div className={styles.grid}>
                    {entries.map((entry) => (
                        <div key={entry.label} className={styles.card}>
                            <h2 className={styles.term}>{entry.label}</h2>
                            <p className={styles.plain}>{entry.plain}</p>
                            <p className={styles.example}>
                                <span className={styles.exampleLabel}>In real life:</span> {entry.example}
                            </p>
                        </div>
                    ))}
                </div>

                <div className={styles.cta}>
                    <p>Ready to see these in your own chart?</p>
                    <Link href="/chart" className="primary-btn-cosmic">See My Chart</Link>
                </div>
            </div>
        </main>
    );
}
