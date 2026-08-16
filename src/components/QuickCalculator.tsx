'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { CALCULATORS, CALCULATOR_ORDER } from '@/lib/astrology/calculators';
import type { CalculatorContent } from '@/lib/astrology/calculators';
import styles from './QuickCalculator.module.css';

interface QuickResult {
    moonSign: string;
    sunSign: string;
    ascendant: { sign: string; degree: number };
    nakshatra: { name: string; lord: string; pada: number };
}

/**
 * One calculator, three framings.
 *
 * The same request answers all three questions, so the tool a visitor arrived
 * for is shown as the headline and the other two sit underneath as findings
 * rather than as teasers. Withholding an answer that has already been
 * calculated, to make someone sign up for it, is the pattern these pages exist
 * to be an alternative to — and it would not even save anything, since the work
 * is done either way.
 */
export default function QuickCalculator({ content }: { content: CalculatorContent }) {
    const [dob, setDob] = useState('');
    const [tob, setTob] = useState('');
    const [place, setPlace] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<QuickResult | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;

        setBusy(true);
        setError(null);
        setResult(null);

        try {
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`
            );
            const geo = await geoRes.json();

            if (!Array.isArray(geo) || geo.length === 0) {
                setError('Could not find that place. Try the nearest large city.');
                return;
            }

            // Split rather than `new Date(...)`: parsing "1990-05-15" as a date
            // shifts it a day backwards in any timezone behind UTC.
            const [year, month, day] = dob.split('-').map(Number);
            const [hour, minute] = tob.split(':').map(Number);

            const res = await fetch('/api/astrology/quick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year,
                    month,
                    day,
                    hour,
                    minute,
                    lat: parseFloat(geo[0].lat),
                    lng: parseFloat(geo[0].lon),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? 'Could not calculate that. Please try again.');
                return;
            }

            setResult(data);
        } catch {
            setError('Could not reach the calculator. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    /** The headline answer for the tool this page is about. */
    const headline = (r: QuickResult) => {
        if (content.tool === 'moon-sign') return { value: r.moonSign, caption: 'Moon sign · Rashi' };
        if (content.tool === 'ascendant') {
            return { value: r.ascendant.sign, caption: `Ascendant · Lagna · ${r.ascendant.degree}°` };
        }
        return {
            value: r.nakshatra.name,
            caption: `Nakshatra · pada ${r.nakshatra.pada} · ruled by ${r.nakshatra.lord}`,
        };
    };

    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Free calculator</p>
                <h1 className="mystic-text">
                    {content.title} <span className={styles.sanskrit}>{content.sanskrit}</span>
                </h1>
                <p className={styles.intro}>{content.intro}</p>
            </header>

            <form className={styles.form} onSubmit={submit}>
                <div className={styles.field}>
                    <label htmlFor="qc-dob">Date of birth</label>
                    <input
                        id="qc-dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="qc-tob">
                        Time of birth
                        {/* Said here rather than after a wrong answer: the
                            ascendant moves a whole sign every two hours. */}
                        <span className={styles.hint}>
                            {content.tool === 'ascendant' ? 'As exact as you can' : 'Local clock time'}
                        </span>
                    </label>
                    <input
                        id="qc-tob"
                        type="time"
                        value={tob}
                        onChange={(e) => setTob(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="qc-pob">Place of birth</label>
                    <input
                        id="qc-pob"
                        type="text"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        placeholder="City, state or country"
                        required
                    />
                </div>

                <button type="submit" className={styles.submit} disabled={busy}>
                    {busy ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Calculating
                        </>
                    ) : (
                        'Calculate'
                    )}
                </button>

                {error && <p className={styles.error}>{error}</p>}
            </form>

            {result && (
                <section className={styles.result}>
                    <div className={styles.headline}>
                        <span className={styles.headlineValue}>{headline(result).value}</span>
                        <span className={styles.headlineCaption}>{headline(result).caption}</span>
                    </div>

                    <p className={styles.meaning}>{content.whatItMeans}</p>

                    {/* Everything the same calculation produced. Already paid
                        for, so there is nothing to gain by hiding it. */}
                    <dl className={styles.alsoFound}>
                        <div>
                            <dt>Moon sign</dt>
                            <dd>{result.moonSign}</dd>
                        </div>
                        <div>
                            <dt>Ascendant</dt>
                            <dd>
                                {result.ascendant.sign} {result.ascendant.degree}°
                            </dd>
                        </div>
                        <div>
                            <dt>Nakshatra</dt>
                            <dd>
                                {result.nakshatra.name}, pada {result.nakshatra.pada}
                            </dd>
                        </div>
                        <div>
                            <dt>Sun sign</dt>
                            <dd>{result.sunSign}</dd>
                        </div>
                    </dl>

                    <div className={styles.next}>
                        <p className={styles.theRest}>{content.theRest}</p>
                        <Link href="/login?mode=signup" className={styles.cta}>
                            See this in your full chart
                        </Link>
                    </div>
                </section>
            )}

            <nav className={styles.siblings} aria-label="Other calculators">
                <h2 className={styles.siblingsHead}>Other calculators</h2>
                <ul>
                    {CALCULATOR_ORDER.filter((t) => t !== content.tool).map((t) => (
                        <li key={t}>
                            <Link href={`/calculators/${CALCULATORS[t].slug}`}>
                                {CALCULATORS[t].searchTitle}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link href="/patterns">Sade Sati, Mangal Dosha and Kala Sarpa</Link>
                    </li>
                </ul>
            </nav>

            <p className={styles.method}>
                Calculated sidereally with the Lahiri ayanamsa, using the same engine as a full
                AskChetna chart — so this answer will not disagree with the one you get after
                signing up. <Link href="/how-we-calculate">How we calculate</Link>.
            </p>
        </main>
    );
}
