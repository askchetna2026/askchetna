'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getProfiles, primaryProfile } from '@/lib/profileStore';
import type { StoredProfile } from '@/lib/profileStore';
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
    const { status } = useSession();

    const [dob, setDob] = useState('');
    const [tob, setTob] = useState('');
    const [place, setPlace] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<QuickResult | null>(null);

    /**
     * Charts this seeker has already given us.
     *
     * Asking a signed-in user to retype their birth date, time and city — the
     * three things they typed at onboarding and which the app is holding — is
     * the app admitting it has not looked. The form stays for signed-out
     * visitors, because answering without an account is the entire purpose of
     * these pages.
     */
    const [profiles, setProfiles] = useState<StoredProfile[]>([]);
    const [profileId, setProfileId] = useState<string>('');

    useEffect(() => {
        if (status !== 'authenticated') return;
        let cancelled = false;

        (async () => {
            const payload = await getProfiles();
            if (cancelled || !payload?.profiles?.length) return;
            setProfiles(payload.profiles);
            setProfileId(primaryProfile(payload)?.id ?? payload.profiles[0].id);
        })();

        return () => { cancelled = true; };
    }, [status]);

    const usingSaved = profiles.length > 0 && profileId !== 'manual';

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;

        setBusy(true);
        setError(null);
        setResult(null);

        try {
            let year: number, month: number, day: number, hour: number, minute: number;
            let lat: number, lng: number;

            if (usingSaved) {
                const chosen = profiles.find((p) => p.id === profileId);
                if (!chosen || typeof chosen.latitude !== 'number' || typeof chosen.longitude !== 'number') {
                    setError('That saved chart is missing its birth place. Please pick another.');
                    return;
                }

                // The stored date is an ISO string; take the calendar parts off
                // the front rather than through a Date, which shifts the day
                // backwards in any timezone behind UTC.
                [year, month, day] = chosen.dateOfBirth.slice(0, 10).split('-').map(Number);
                [hour, minute] = (chosen.timeOfBirth || '12:00').split(':').map(Number);
                lat = chosen.latitude;
                lng = chosen.longitude;
            } else {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`
                );
                const geo = await geoRes.json();

                if (!Array.isArray(geo) || geo.length === 0) {
                    setError('Could not find that place. Try the nearest large city.');
                    return;
                }

                // Split rather than `new Date(...)`: parsing "1990-05-15" as a
                // date shifts it a day backwards in any timezone behind UTC.
                [year, month, day] = dob.split('-').map(Number);
                [hour, minute] = tob.split(':').map(Number);
                lat = parseFloat(geo[0].lat);
                lng = parseFloat(geo[0].lon);
            }

            const res = await fetch('/api/astrology/quick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, month, day, hour, minute, lat, lng }),
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
                {profiles.length > 0 && (
                    <div className={styles.field}>
                        <label htmlFor="qc-profile">Whose chart?</label>
                        <select
                            id="qc-profile"
                            className={styles.select}
                            value={profileId}
                            onChange={(e) => setProfileId(e.target.value)}
                        >
                            {profiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} · {p.dateOfBirth.slice(0, 10)}
                                </option>
                            ))}
                            {/* Still offered, because someone may want to check
                                a chart they have not saved — a friend's, or one
                                they are only curious about. */}
                            <option value="manual">Someone else — enter details</option>
                        </select>
                    </div>
                )}

                {!usingSaved && (
                  <>
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
                  </>
                )}

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
