'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { ArrowRight, TrendingUp, Clock, Heart, Calendar, Sparkles, Compass, MessageSquare, Eye, ShieldCheck, BookOpen } from 'lucide-react';
import AIClaritySearchBar from '@/components/AIClaritySearchBar';
import EnergyWidget from '@/components/EnergyWidget';
import JournalWidget from '@/components/JournalWidget';
import PanchangWidget from '@/components/PanchangWidget';
import CosmicMandala from '@/components/CosmicMandala';
import NewsletterSignupCard from '@/components/NewsletterSignupCard';
import RashiMedallions from '@/components/sections/RashiMedallions';
import Masthead from '@/components/Masthead';
import { useProfile } from '@/context/ProfileContext';
import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

// The twelve rashis now live in RashiMedallions, alongside their artwork slots.

// Navagraha – the 9 Vedic planets
const NAVAGRAHA = [
  { glyph: '☉', name: 'Surya', en: 'Sun' },
  { glyph: '☽', name: 'Chandra', en: 'Moon' },
  { glyph: '♂', name: 'Mangala', en: 'Mars' },
  { glyph: '☿', name: 'Budha', en: 'Mercury' },
  { glyph: '♃', name: 'Guru', en: 'Jupiter' },
  { glyph: '♀', name: 'Shukra', en: 'Venus' },
  { glyph: '♄', name: 'Shani', en: 'Saturn' },
  { glyph: '☊', name: 'Rahu', en: 'North Node' },
  { glyph: '☋', name: 'Ketu', en: 'South Node' },
];

const NEWSLETTER_SIGNUP_HREF = '/login?mode=signup&callbackUrl=/dashboard';

export default function Home() {
  const { data: session, status } = useSession();
  const { openNewProfileModal } = useProfile();
  const isLoggedIn = status === 'authenticated';
  const hasTrackedLandingView = useRef(false);

  const [teaserDob, setTeaserDob] = useState('');
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [teaserResult, setTeaserResult] = useState<{ sign: string; sanskritName: string; theme: string; reading: string } | null>(null);
  const [teaserError, setTeaserError] = useState('');



  useEffect(() => {
    if (isLoggedIn || hasTrackedLandingView.current) {
      return;
    }

    hasTrackedLandingView.current = true;
    void trackEvent(ANALYTICS_EVENTS.LANDING_VIEW, {
      metadata: {
        loggedIn: false,
      },
    });
  }, [isLoggedIn]);



  const handleFetchTeaser = async () => {
    if (!teaserDob) {
      setTeaserError('Please select a birth date.');
      return;
    }

    void trackEvent(ANALYTICS_EVENTS.TEASER_STARTED, {
      metadata: {
        birthDate: teaserDob,
      },
    });

    setTeaserLoading(true);
    setTeaserError('');
    setTeaserResult(null);
    try {
      const res = await fetch(`/api/teaser?dob=${teaserDob}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch teaser.');
      }
      const data = await res.json();
      setTeaserResult(data);
      void trackEvent(ANALYTICS_EVENTS.TEASER_COMPLETED, {
        metadata: {
          birthDate: teaserDob,
          sign: data?.sign || null,
          sanskritName: data?.sanskritName || null,
        },
      });
    } catch (err: unknown) {
      setTeaserError(err instanceof Error ? err.message : 'Failed to load teaser reading.');
    } finally {
      setTeaserLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      {isLoggedIn ? (
        <section className={styles.dashboard}>
          <div className={styles.dashboardGrid}>
            {/* Mandala watermark for logged-in home too */}
            <div className={styles.dashboardMandalaBg} aria-hidden="true">
              <CosmicMandala size={500} opacity={0.05} animate />
            </div>
            <div className={styles.dashboardHeader}>
              <div>
                <span className="cosmic-label">✦ Namaste</span>
                <h1 className={styles.welcomeText}>
                  Welcome back, <span className={styles.userName}>{session?.user?.name?.split(' ')[0] || 'Seeker'}</span>
                </h1>
                <p className={styles.dashboardSubtitle}>
                  Observe your patterns and act with awareness today.
                </p>
              </div>
              <Link href="/dashboard" className={styles.primaryBtnSmall}>
                Dashboard <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.widgetGrid}>
              <div className={styles.mainColumn}>
                <EnergyWidget />
                <PanchangWidget />
                <JournalWidget />
              </div>

              <div className={styles.sideColumn}>
                <div className={styles.quickLinks}>
                  <Link href="/chart" className={styles.quickLinkItem}>
                    <TrendingUp size={24} color="var(--accent-gold)" />
                    <span>See My Chart</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/timing" className={styles.quickLinkItem}>
                    <Clock size={24} color="var(--accent-gold)" />
                    <span>View Your Timeline</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/clarity" className={styles.quickLinkItem}>
                    <MessageSquare size={24} color="var(--accent-gold)" />
                    <span>Ask Chetna AI</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* ═══════════════════════════════════
              HERO SECTION with Mandala + Zodiac Wheel
              ═══════════════════════════════════ */}
          <div className={styles.bgWrapper}>
            <section className={styles.hero}>
              {/* The illustrated banner replaces the mandala watermark: it is the
                  first impression, and a watermark behind text was doing none of
                  the work the artwork can. */}
              <Masthead />

              <div className={styles.heroContainer}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2 }}
                >
                  <h1 className={styles.heroTitle}>
                    Ever wonder why the same patterns keep showing up in your life?
                  </h1>
                  <div className={styles.heroContent}>
                    <p className={styles.heroSubtitle}>
                      Chetna helps you understand why — using your birth chart as a map, not a verdict.
                    </p>
                    <p className={styles.heroDescription}>
                      Consult our AI-guided reflection tool to explore questions about relationships, career choices, and life patterns — using astrology as a lens, not a prediction.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className={styles.quoteSection}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  viewport={{ once: true }}
                >
                  <p className={styles.quote}>
                    &ldquo;Astrology should increase clarity, responsibility, and self-respect—not fear, dependence, or fantasy.&rdquo;
                  </p>

                  <div className={styles.heroActions}>
                    <Link href="/clarity" className="primary-btn-cosmic">
                      ✦ Ask Chetna AI
                    </Link>
                    <Link href="/chart" className={`secondary-btn-cosmic ${styles.heroSecondaryCta}`}>
                      See My Chart
                    </Link>
                  </div>

                  <p className={styles.socialProofLine}>
                    <Sparkles size={14} /> 1,200+ charts explored by seekers across 18 countries
                  </p>

                  {/* Date Teaser Form (No-login) */}
                  <div className={styles.teaserFormContainer}>
                      <h3 className={styles.teaserFormTitle}>Get a Quick Teaser Reading Instantly</h3>
                      <p className={styles.teaserFormSubtitle}>Enter your birth date to unlock a snippet of your sidereal Sun sign alignment.</p>
                      <div className={styles.teaserFormFields}>
                          <input
                              type="date"
                              value={teaserDob}
                              onChange={(e) => setTeaserDob(e.target.value)}
                              className={styles.teaserInput}
                              aria-label="Your birth date"
                              required
                          />
                          <button 
                              onClick={handleFetchTeaser} 
                              className={styles.teaserSubmitBtn}
                              disabled={teaserLoading}
                          >
                              {teaserLoading ? 'Reading Sky...' : 'Get Teaser'}
                          </button>
                      </div>
                      {teaserResult && (
                          <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={styles.teaserResultBox}
                          >
                              <h4 className={styles.teaserResultSign}>{teaserResult.sanskritName} ({teaserResult.sign})</h4>
                              <p className={styles.teaserResultTheme}><strong>Theme:</strong> {teaserResult.theme}</p>
                              <p className={styles.teaserResultText}>{teaserResult.reading}</p>
                              <div className={styles.teaserUnlockOffer}>
                                  <span>Want to see your full Navamsa, Dasha timeline, and ask AI detailed questions?</span>
                                  <Link href={NEWSLETTER_SIGNUP_HREF} className={styles.teaserUnlockLink}>Sign Up Free (Get 10 Credits) <ArrowRight size={14} /></Link>
                              </div>
                          </motion.div>
                      )}
                      {teaserError && (
                          <p className={styles.teaserErrorText}>{teaserError}</p>
                      )}
                  </div>
                </motion.div>

                {/* Navagraha planet symbols strip */}
                <motion.div
                  className={styles.navagrahaStrip}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 1 }}
                  viewport={{ once: true }}
                >
                  {NAVAGRAHA.map((planet) => (
                    <div key={planet.name} className={styles.navagrahaItem}>
                      <span className={styles.planetGlyph}>{planet.glyph}</span>
                      <span className={styles.planetSanskrit}>{planet.name}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </section>
          </div>

          {/* ═══════════════════════════════════
              THE TWELVE RASHIS
              ═══════════════════════════════════ */}
          <RashiMedallions />

          {/* ═══════════════════════════════════
              THE NINE GRAHAS (Midnight Blue Section)
              ═══════════════════════════════════ */}
          <section className={styles.nineGrahasSection}>
            <div className={styles.nineGrahasContainer}>
              <div className={styles.nineGrahasLeft}>
                <span className="cosmic-label" style={{ color: '#D4AF37' }}>✦ Navagraha · Celestial Bodies ✦</span>
                <h2 className={styles.nineGrahasTitle}>THE NINE GRAHAS</h2>
                <div className={styles.nineGrahasDivider}></div>
                <p className={styles.nineGrahasDescription}>
                  Every reading begins with where the sun was standing at the moment you arrived — and where the nine grahas sit relative to your ascendant. Learn how each planetary energy shapes your inner experience.
                </p>
                <div className={styles.nineGrahasActions}>
                  <Link href="/chart" className={styles.nineGrahasCtaBtn}>
                    Explore Your Planetary Map <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <div className={styles.nineGrahasRight}>
                <div className={styles.grahasGrid}>
                  {[
                    { glyph: '☉', sa: 'Sūrya', en: 'Sun', desc: 'Vitality & Soul' },
                    { glyph: '☽', sa: 'Chandra', en: 'Moon', desc: 'Mind & Memory' },
                    { glyph: '♂', sa: 'Maṅgala', en: 'Mars', desc: 'Drive & Courage' },
                    { glyph: '☿', sa: 'Budha', en: 'Mercury', desc: 'Intellect & Speech' },
                    { glyph: '♃', sa: 'Guru', en: 'Jupiter', desc: 'Wisdom & Grace' },
                    { glyph: '♀', sa: 'Śukra', en: 'Venus', desc: 'Love & Harmony' },
                    { glyph: '♄', sa: 'Śani', en: 'Saturn', desc: 'Time & Maturity' },
                    { glyph: '☊', sa: 'Rāhu', en: 'North Node', desc: 'Threshold & Desire' },
                    { glyph: '☋', sa: 'Ketu', en: 'South Node', desc: 'Release & Origins' },
                  ].map((planet) => (
                    <div key={planet.sa} className={styles.grahaCard}>
                      <span className={styles.grahaGlyph}>{planet.glyph}</span>
                      <div className={styles.grahaMeta}>
                        <div className={styles.grahaNames}>
                          <span className={styles.grahaSanskrit}>{planet.sa}</span>
                          <span className={styles.grahaEnglish}>({planet.en})</span>
                        </div>
                        <span className={styles.grahaDesc}>{planet.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </>
      )}
    </main>
  );
}