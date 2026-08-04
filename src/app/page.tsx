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
import { HOME_TOPIC_LINKS } from '@/lib/seoLandingPages';

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

  const [latestPosts, setLatestPosts] = useState<{ id: string; title: string; content: string }[]>([]);

  useEffect(() => {
    if (isLoggedIn) return;
    fetch('/api/blogs')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setLatestPosts(data.slice(0, 3)))
      .catch(() => { });
  }, [isLoggedIn]);

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

  const postTeaser = (content: string) => {
    const clean = content.replace(/\s+/g, ' ').trim();
    return clean.length > 110 ? `${clean.slice(0, 109)}…` : clean;
  };

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

          {/* ═══════════════════════════════════
              LIVE AI SAMPLE RESPONSES
              ═══════════════════════════════════ */}
          <section className={styles.liveSampleSection}>
            <div className={styles.sectionHeader}>
              <span className="cosmic-label">❋ Pratyaksha · Live Preview ❋</span>
              <h2 className="mystic-text">A Sample Conversation with Chetna</h2>
              <div className="sacred-divider"></div>
            </div>

            <div className={styles.liveSampleContainer}>
              <div className={styles.sampleChatHeader}>
                <Sparkles size={20} color="var(--accent-gold)" />
                <span className={styles.sampleChatTitle}>Chetna AI Session</span>
              </div>
              <div className={styles.sampleQuestion}>
                &ldquo;Why do I hold onto control when things are going well?&rdquo;
              </div>
              <div className={styles.sampleAnswer}>
                <div className={styles.sampleSection}>
                  <span className={styles.sampleSectionHeader}>1. Chart Observation</span>
                  <p className={styles.sampleSectionContent}>
                    Your Moon is placed in the 8th House in Scorpio, conjunct Saturn. This indicates a deeply feeling nature that associates emotional vulnerability with insecurity.
                  </p>
                </div>
                <div className={styles.sampleSection}>
                  <span className={styles.sampleSectionHeader}>2. Pattern Explanation</span>
                  <p className={styles.sampleSectionContent}>
                    When life is stable, your Saturnian influence anticipates a drop or crisis to protect itself. You default to hyper-vigilance or micro-managing outcomes to maintain safety, which drains your energy.
                  </p>
                </div>
                <div className={styles.sampleSection}>
                  <span className={styles.sampleSectionHeader}>3. What Helps / What to Avoid</span>
                  <p className={styles.sampleSectionContent}>
                    Notice the exact moment you begin to over-plan. Gently remind yourself that stability is not a threat. Avoid trying to predict the outcome of every conversation.
                  </p>
                </div>
                <div className={styles.sampleSection}>
                  <span className={styles.sampleSectionHeader}>4. Free-Will Reminder</span>
                  <p className={styles.sampleSectionContent} style={{ fontStyle: 'italic' }}>
                    This is the energetic pattern at play. What you do with this awareness in the present moment is entirely your choice.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════
              CREDITS SYSTEM GUIDE
              ═══════════════════════════════════ */}
          <section className={styles.creditsSection}>
            <div className={styles.sectionHeader}>
              <span className="cosmic-label">❋ Dana · Value System ❋</span>
              <h2 className="mystic-text">How Credits Work</h2>
              <div className="sacred-divider"></div>
              <p className={styles.creditsOneLiner}>1 Credit = 1 AI Reflection Session or Basic Chart Analysis</p>
            </div>

            <div className={styles.creditsGrid}>
              <div className={styles.creditCard}>
                <h3 className={styles.creditTitle}>Free Welcome Bonus</h3>
                <p className={styles.creditCost}>10 Credits (Free on Signup)</p>
                <ul className={styles.creditBenefitList}>
                  <li className={styles.creditBenefitItem}>Full Vedic Birth Chart calculation</li>
                  <li className={styles.creditBenefitItem}>Dasha timeline activation</li>
                  <li className={styles.creditBenefitItem}>10 AI reflection queries</li>
                </ul>
              </div>

              <div className={styles.creditCard}>
                <h3 className={styles.creditTitle}>Clarity Packs</h3>
                <p className={styles.creditCost}>Starts at ₹149</p>
                <ul className={styles.creditBenefitList}>
                  <li className={styles.creditBenefitItem}>Additional credits for Ask Chetna AI</li>
                  <li className={styles.creditBenefitItem}>Compare relationship compatibility</li>
                  <li className={styles.creditBenefitItem}>Never expires; top up anytime</li>
                </ul>
              </div>

              <div className={styles.creditCard}>
                <h3 className={styles.creditTitle}>Premium Report</h3>
                <p className={styles.creditCost}>Detailed PDF Synthesis</p>
                <ul className={styles.creditBenefitList}>
                  <li className={styles.creditBenefitItem}>10 detailed life chapters</li>
                  <li className={styles.creditBenefitItem}>In-depth Career, Health, & Love analysis</li>
                  <li className={styles.creditBenefitItem}>Delivered directly to your inbox</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════
              TESTIMONIALS SECTION
              ═══════════════════════════════════ */}
          <section className={styles.testimonialsSection}>
            <div className={styles.sectionHeader}>
              <span className="cosmic-label">❋ Sakshi · Social Proof ❋</span>
              <h2 className="mystic-text">Reflections from Seekers</h2>
              <div className="sacred-divider"></div>
            </div>

            <div className={styles.testimonialsGrid}>
              <div className={styles.testimonialCard}>
                <p className={styles.testimonialQuote}>
                  &ldquo;This helped me stop spiralling about my career. Seeing my placement explained psychologically was the wake-up call I needed.&rdquo;
                </p>
                <span className={styles.testimonialAuthor}>Priya, 28, Pune</span>
              </div>

              <div className={styles.testimonialCard}>
                <p className={styles.testimonialQuote}>
                  &ldquo;Chetna doesn&apos;t tell you what to do or predict the future. It helps you look at your repeating patterns so you can make active choices.&rdquo;
                </p>
                <span className={styles.testimonialAuthor}>Arjun, 34, Bangalore</span>
              </div>

              <div className={styles.testimonialCard}>
                <p className={styles.testimonialQuote}>
                  &ldquo;The relationship compatibility analysis is so mature. It focuses on communication styles and conflict triggers rather than a generic score.&rdquo;
                </p>
                <span className={styles.testimonialAuthor}>Meera, 30, Mumbai</span>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════
              HOW IT WORKS
              ═══════════════════════════════════ */}
          <section id="how-it-works" className={styles.howItWorks + " section-anchor"}>
            <div className={styles.sectionHeader}>
              <span className="cosmic-label">❋ Sadhana · The Practice ❋</span>
              <h2 className="mystic-text">How Chetna Works</h2>
              <div className="sacred-divider"></div>
            </div>

            <div className={styles.steps}>
              <motion.article
                className={`${styles.step}${0 % 2 === 1 ? ' ' + styles.stepFlip : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className={styles.collage}>
                  <Image
                    className={styles.collageArt}
                    src="/art/scenes/kundali-desk.png"
                    alt="A kundali chart drawn on handmade paper beside a brass lamp"
                    width={1024}
                    height={1024}
                    sizes="(max-width: 880px) 100vw, 500px"
                  />
                  <div className={styles.collageChip}>
                    <div className={styles.chipKey}>Ascendant</div>
                    <div className={styles.chipValue}>Meṣa 14°22′</div>
                  </div>
                </div>

                <div className={styles.stepBody}>
                  <div className={styles.stepNum}>
                    <span>1</span>
                    <span className={styles.stepKicker}>Cast</span>
                  </div>
                  <h3 className={styles.stepTitle}>Your chart, calculated exactly</h3>
                  <p className={styles.stepText}>Sidereal positions worked from your exact birth moment and place — the same mathematics a Jyotiṣī would do by hand, finished in a second.</p>
                  <p className={styles.stepNote}>Ever wonder why you feel like an introvert but take charge in public? Your ascendant tells the story of your social style.</p>
                </div>
              </motion.article>

              <motion.article
                className={`${styles.step}${1 % 2 === 1 ? ' ' + styles.stepFlip : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className={styles.collage}>
                  <Image
                    className={styles.collageArt}
                    src="/art/scenes/journal-diya.png"
                    alt="An open journal beside a burning diya"
                    width={1024}
                    height={1024}
                    sizes="(max-width: 880px) 100vw, 500px"
                  />
                  <div className={styles.collageChip}>
                    <div className={styles.chipKey}>Your question</div>
                    <div className={styles.chipValue}>“Why this, again?”</div>
                  </div>
                </div>

                <div className={styles.stepBody}>
                  <div className={styles.stepNum}>
                    <span>2</span>
                    <span className={styles.stepKicker}>Read</span>
                  </div>
                  <h3 className={styles.stepTitle}>The pattern beneath the question</h3>
                  <p className={styles.stepText}>Placements read through behaviour and psychological pattern, never as fixed fortune. Focus reports go deeper on career, wealth and relationships without fear-mongering.</p>
                  <p className={styles.stepNote}>Priya kept changing careers. Her chart showed Rāhu in the 10th house — a restlessness around status. Once she understood it, she stopped blaming herself.</p>
                </div>
              </motion.article>

              <motion.article
                className={`${styles.step}${2 % 2 === 1 ? ' ' + styles.stepFlip : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className={styles.collage}>
                  <Image
                    className={styles.collageArt}
                    src="/art/scenes/tulsi-constellation.png"
                    alt="A tulsi plant whose stem becomes a constellation"
                    width={1024}
                    height={1024}
                    sizes="(max-width: 880px) 100vw, 500px"
                  />
                  <div className={styles.collageChip}>
                    <div className={styles.chipKey}>Current daśā</div>
                    <div className={styles.chipValue}>Guru · 4y 2m left</div>
                  </div>
                </div>

                <div className={styles.stepBody}>
                  <div className={styles.stepNum}>
                    <span>3</span>
                    <span className={styles.stepKicker}>Return</span>
                  </div>
                  <h3 className={styles.stepTitle}>Watch the season turn</h3>
                  <p className={styles.stepText}>Daśā periods move over years, not days. Knowing which planetary season governs your current stretch shows what to build now and what to let ripen.</p>
                  <p className={styles.stepNote}>Entering a Śani phase? That asks for slow discipline, not reckless expansion. Knowing the timeline is what saves you from burning out against it.</p>
                </div>
              </motion.article>
            </div>

            <div className={styles.stepsCta}>
              <p className={styles.stepsCtaText}>
                Then bring the question that is already keeping you up — not
                &ldquo;will I marry?&rdquo; but &ldquo;why do I pull away when someone gets close?&rdquo;
              </p>
              <Link href="/clarity" className="primary-btn-cosmic">Ask Chetna AI</Link>
            </div>
          </section>

          {/* ═══════════════════════════════════
              FROM THE BLOG
              ═══════════════════════════════════ */}
          <section className={styles.blogSection}>
            <div className={styles.sectionHeader}>
              <span className="cosmic-label">❋ Gyana · From the Blog ❋</span>
              <h2 className="mystic-text">Learn the Patterns</h2>
              <div className="sacred-divider"></div>
            </div>

            <div className={styles.blogGrid}>
              {latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.id}`} className={styles.blogCard}>
                    <div className={styles.blogCardIcon}><BookOpen size={22} /></div>
                    <h3 className={styles.blogCardTitle}>{post.title}</h3>
                    <p className={styles.blogCardTeaser}>{postTeaser(post.content)}</p>
                    <span className={styles.blogCardLink}>Read more <ArrowRight size={14} /></span>
                  </Link>
                ))
              ) : (
                <>
                  <Link href="/blog" className={styles.blogCard}>
                    <div className={styles.blogCardIcon}><BookOpen size={22} /></div>
                    <h3 className={styles.blogCardTitle}>What is a Dasha Period in Astrology?</h3>
                    <p className={styles.blogCardTeaser}>The multi-year life chapters that shape your timing — explained in plain English.</p>
                    <span className={styles.blogCardLink}>Read more <ArrowRight size={14} /></span>
                  </Link>

                  <Link href="/blog" className={styles.blogCard}>
                    <div className={styles.blogCardIcon}><BookOpen size={22} /></div>
                    <h3 className={styles.blogCardTitle}>Rahu &amp; Ketu: The Nodes of Desire</h3>
                    <p className={styles.blogCardTeaser}>Why you chase some things and quietly let others go — the karmic axis decoded.</p>
                    <span className={styles.blogCardLink}>Read more <ArrowRight size={14} /></span>
                  </Link>

                  <Link href="/blog" className={styles.blogCard}>
                    <div className={styles.blogCardIcon}><BookOpen size={22} /></div>
                    <h3 className={styles.blogCardTitle}>Moon Sign vs Sun Sign: What&apos;s the Difference?</h3>
                    <p className={styles.blogCardTeaser}>Why your Vedic Moon sign often describes you better than your Sun sign.</p>
                    <span className={styles.blogCardLink}>Read more <ArrowRight size={14} /></span>
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════
              PHILOSOPHY SECTION
              ═══════════════════════════════════ */}
          <section className={styles.philosophySection}>
            <div className={styles.philosophyHeader}>
              <span className="cosmic-label">❋ Darshana · Our Vision ❋</span>
              <h2 className={styles.philosophyMainTitle}>Our Philosophy</h2>
              <div className="sacred-divider"></div>
            </div>

            <div className={styles.philosophyContent}>
              <div className={styles.philosophyPart}>
                <div className={styles.philosophyIcon}>
                  <span className="planet-glyph" style={{ fontSize: '2rem' }}>♀</span>
                </div>
                <h3 className={styles.philosophyTitle}>About AskChetna</h3>
                <p className={styles.philosophyText}>
                  AskChetna was created with a simple belief: Astrology should help people become clearer, calmer, and more responsible — not more confused.
                </p>
                <p className={styles.philosophyText}>
                  In a world full of prediction-heavy astrology, AskChetna offers a different approach.
                </p>
              </div>

              <div className={styles.separator}></div>

              <div className={styles.philosophyPart}>
                <div className={styles.philosophyIcon}>
                  <span className="planet-glyph" style={{ fontSize: '2rem' }}>☊</span>
                </div>
                <h3 className={styles.philosophyTitle}>AskChetna does not:</h3>
                <ul className={styles.doesNotList}>
                  <li className={styles.doesNotItem}>Use fear-based astrology to influence decisions</li>
                  <li className={styles.doesNotItem}>Force or prescribe remedies, rituals</li>
                  <li className={styles.doesNotItem}>Tell you what will or won&apos;t happen in your life</li>
                  <li className={styles.doesNotItem}>Label time periods as good or bad</li>
                </ul>
                <p className={styles.doesNotSummary}>
                  Instead of predicting outcomes, AskChetna supports understanding—of patterns, responses, and inner awareness.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.pathwaysSection}>
            <div className={styles.sectionHeader}>
              <span className="cosmic-label">❋ Paths Into the Work ❋</span>
              <h2 className="mystic-text">Explore by the Question You Are Carrying</h2>
              <div className="sacred-divider"></div>
              <p className={styles.pathwaysIntro}>
                Start with the part of life that already feels charged. These focused pages are built for searchers who want clearer entry points into love, work, timing, and reflective AI astrology.
              </p>
            </div>

            <div className={styles.pathwaysGrid}>
              {HOME_TOPIC_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className={styles.pathwayCard}>
                  <h3 className={styles.pathwayTitle}>{item.title}</h3>
                  <p className={styles.pathwayDescription}>{item.description}</p>
                  <span className={styles.pathwayLink}>Explore Topic <ArrowRight size={14} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.newsletterSection}>
            <NewsletterSignupCard
              title="Get practical cosmic notes for the weeks when you need perspective"
              description="Join the list for grounded astrology reflections, timing insights, and product updates that help you keep learning between readings."
              source="homepage_growth_section"
              signupHref={NEWSLETTER_SIGNUP_HREF}
            />
          </section>
        </>
      )}
    </main>
  );
}
