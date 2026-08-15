'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../app/timing/page.module.css';
import { Clock, Calendar, Info, Sparkles, User, Zap, Loader2 } from 'lucide-react';

import DashaDisplay from '@/components/DashaDisplay';
import DashaTimeline from '@/components/DashaTimeline';
import Term from '@/components/Term';
import DisclaimerNote from '@/components/DisclaimerNote';
import { useComplexity } from '@/context/ComplexityContext';
import { getProfiles } from '@/lib/profileStore';
import { describeDashaLord } from '@/lib/astrology/dashaContext';

interface UserProfile {
    id: string;
    name: string;
    dateOfBirth: string | Date;
    chartData?: any;
}

interface PranaDasha {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
}

interface SookshmaDasha {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
    pranaDashas?: PranaDasha[];
}

interface PratyantarDasha {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
    sookshmaDashas?: SookshmaDasha[];
}

interface Antardasha {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
    pratyantarDashas?: PratyantarDasha[];
}

interface DashaPeriod {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
    antardashas?: Antardasha[];
}

// Plain-language life themes — what the phase FEELS like, before any planet name (6.1, 6.2)
const PHASE_THEMES: Record<string, { theme: string, asking: string }> = {
    'Jupiter': { theme: 'A season of growth, learning, and expansion', asking: 'This is an opening phase. Life is asking you to say yes to opportunities, widen your horizons, and trust that you have room to grow — through new knowledge, mentors, or beliefs.' },
    'Saturn': { theme: 'A season of discipline, structure, and maturing', asking: 'This is a building phase, not a resting one. Life is asking you to slow down, take responsibility, and do the patient work — what you construct now is meant to last.' },
    'Mercury': { theme: 'A season of communication, learning, and connection', asking: 'This is a thinking and connecting phase. Life is asking you to learn, exchange ideas, and put your intelligence to work through conversation, study, or commerce.' },
    'Venus': { theme: 'A season of relationships, creativity, and pleasure', asking: 'This is a softening phase. Life is asking you to nurture connection, create beauty, and allow yourself comfort and enjoyment — relationships and creativity flow more easily now.' },
    'Sun': { theme: 'A season of identity, clarity, and leadership', asking: 'This is a stepping-forward phase. Life is asking you to claim your authority, express who you truly are, and lead from a place of confidence rather than hiding.' },
    'Moon': { theme: 'A season of emotion, care, and inner life', asking: 'This is a feeling phase. Life is asking you to tend to your emotional needs, nurture and be nurtured, and honour your inner world and your home.' },
    'Mars': { theme: 'A season of action, effort, and identity', asking: 'This is a doing phase, not a resting phase. Life is asking you to take initiative, fight for what matters, and put your energy into focused, courageous effort.' },
    'Rahu': { theme: 'A season of ambition, hunger, and the unfamiliar', asking: 'This is a reaching phase. Life is asking you to chase the unconventional and the unknown — expect intensity and rapid change as you stretch beyond your comfort zone.' },
    'Ketu': { theme: 'A season of release, introspection, and letting go', asking: 'This is a releasing phase. Life is asking you to detach from what no longer serves you, turn inward, and find meaning beyond the material.' }
};

const LORD_DESCRIPTIONS: Record<string, { supports: string, resists: string, themes: string }> = {
    'Jupiter': { supports: 'Growth, wisdom, teaching, expansion.', resists: 'Reckless shortcuts, lack of foundations.', themes: 'Optimism, spiritual seeking.' },
    'Saturn': { supports: 'Discipline, structure, long-term legacy.', resists: 'Laziness, superficial expansion.', themes: 'Duty, maturity, reality checks.' },
    'Mercury': { supports: 'Communication, business, learning.', resists: 'Emotional impulsivity, ignoring details.', themes: 'Intelligence, adaptability.' },
    'Venus': { supports: 'Relationships, creativity, comfort.', resists: 'Financial waste, over-indulgence.', themes: 'Beauty, harmony, desire.' },
    'Sun': { supports: 'Leadership, clarity, self-expression.', resists: 'Playing small, ego-driven conflicts.', themes: 'Authority, vitality.' },
    'Moon': { supports: 'Emotional nurturing, caregiving, intuition.', resists: 'Rationalizing feelings, over-sensitivity.', themes: 'Care, home, change.' },
    'Mars': { supports: 'Courage, technical work, competition.', resists: 'Passive-aggression, indecision.', themes: 'Energy, drive, conflict.' },
    'Rahu': { supports: 'Innovation, ambition, breaking norms.', resists: 'Standard paths, repetitive tasks.', themes: 'Desire, obsession, newness.' },
    'Ketu': { supports: 'Introspection, research, moving on.', resists: 'Material attachments, staying in comfort.', themes: 'Detachment, deep focus.' }
};

export default function TimingPageContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { complexity } = useComplexity();

    const [loading, setLoading] = useState(true);
    const [profilesLoading, setProfilesLoading] = useState(true);
    const [fetchingAi, setFetchingAi] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dashas, setDashas] = useState<DashaPeriod[]>([]);
    const [currentDasha, setCurrentDasha] = useState<DashaPeriod | null>(null);
    const [activeProfiles, setActiveProfiles] = useState<UserProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [aiInsight, setAiInsight] = useState<any>(null);
    const [transits, setTransits] = useState<any>(null);
    const [transitsLoading, setTransitsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any[] | null>(null);
    const [yogas, setYogas] = useState<string[]>([]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProfiles();
        } else if (status === 'unauthenticated') {
            setLoading(false);
            setProfilesLoading(false);
        }
    }, [status]);

    const fetchProfiles = async () => {
        try {
            setProfilesLoading(true);
            const activeData = await getProfiles();
            const profiles = activeData?.profiles || [];
            setActiveProfiles(profiles);

            if (profiles.length > 0) {
                const urlId = searchParams.get('profileId');
                const initialId = urlId && profiles.some((p: any) => p.id === urlId)
                    ? urlId
                    : profiles[0].id;

                setSelectedProfileId(initialId);
                fetchDashas(initialId);
                fetchTransits(initialId);
                fetchAnalysis(initialId);
            } else {
                setLoading(false);
                setProfilesLoading(false);
            }
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
            setError("Could not load your profiles.");
            setLoading(false);
            setProfilesLoading(false);
        }
    };

    const fetchDashas = async (profileId: string) => {
        try {
            setLoading(true);
            setError(null);
            setAiInsight(null); // Reset AI insight when profile changes
            const dashaRes = await fetch(`/api/astrology/dashas?profileId=${profileId}`);
            const data = await dashaRes.json();

            if (dashaRes.ok && data?.dashas) {
                setDashas(data.dashas);
                const current = data.dashas.find((d: DashaPeriod) => d.isCurrent);
                setCurrentDasha(current);
            } else {
                throw new Error(data.error || "Failed to fetch dasha data.");
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to load timing data.";
            setError(errorMessage);
        } finally {
            setLoading(false);
            setProfilesLoading(false);
        }
    };

    /**
     * The engine's reading of THIS chart, per planet.
     *
     * It has always been computed — it is what the AI prompts receive as
     * context — but nothing rendered it, so the page fell back to a table
     * keyed on the dasha lord's name. Cheap to ask for: the route memoises on
     * (profileId, updatedAt), and a natal chart does not change.
     */
    const fetchAnalysis = async (profileId: string) => {
        try {
            const res = await fetch(`/api/astrology/analysis?profileId=${profileId}`);
            if (!res.ok) return;
            const data = await res.json();
            setAnalysis(Array.isArray(data.analysis) ? data.analysis : null);
            setYogas(Array.isArray(data.yogas) ? data.yogas : []);
        } catch (e) {
            console.error('Failed to load chart analysis', e);
        }
    };

    const fetchTransits = async (profileId: string) => {
        try {
            setTransitsLoading(true);
            setTransits(null);
            const res = await fetch(`/api/astrology/transits?profileId=${profileId}`);
            if (res.ok) {
                const data = await res.json();
                setTransits(data.transits);
            }
        } catch (e) {
            console.error('Failed to load transits', e);
        } finally {
            setTransitsLoading(false);
        }
    };

    const fetchAiInsight = async () => {
        if (!selectedProfileId || !currentDasha) return;
        setFetchingAi(true);
        try {
            const res = await fetch('/api/ai/timing-insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId: selectedProfileId,
                    currentDasha: {
                        lord: currentDasha.lord,
                        start: currentDasha.start,
                        end: currentDasha.end
                    }
                })
            });
            const data = await res.json();
            if (res.ok) {
                setAiInsight(data.insight);
            } else {
                alert(data.error || 'Failed to generate cosmic insight');
            }
        } catch (err) {
            console.error('Failed to fetch AI insight:', err);
        } finally {
            setFetchingAi(false);
        }
    };

    const handleProfileChange = (id: string) => {
        setSelectedProfileId(id);
        fetchDashas(id);
        fetchTransits(id);
        // Cleared first: leaving the previous seeker's reading on screen while
        // the new one loads is worse than showing nothing.
        setAnalysis(null);
        fetchAnalysis(id);
        router.push(`/timing?profileId=${id}`, { scroll: false });
    };

    if (profilesLoading || (loading && dashas.length === 0)) return (
        <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Scanning cosmic cycles...</p>
        </div>
    );

    if (!session) return (
        <div className={styles.container}>
            <div className={styles.guestState}>
                <Clock size={48} className={styles.guestIcon} />
                <h2>Login to View Your Timeline</h2>
                <p>Track your planetary periods and understand the &apos;weather&apos; of your life.</p>
                <button onClick={() => window.location.href = '/login?callbackUrl=/timing'} className={styles.loginBtn}>Login Now</button>
            </div>
        </div>
    );

    if (error && activeProfiles.length === 0) return (
        <div className={styles.container}>
            <div className={styles.errorState}>
                <p>{error}</p>
                <button onClick={() => window.location.href = '/chart'} className={styles.primaryBtn}>Create Chart</button>
            </div>
        </div>
    );

    const interpretation = currentDasha ? LORD_DESCRIPTIONS[currentDasha.lord] : null;
    const selectedProfile = activeProfiles.find(p => p.id === selectedProfileId);

    /* Where the current lord actually sits in THIS profile's chart. Recomputed
       when either changes, so switching profile switches the reading rather
       than leaving the previous seeker's placement on screen. */
    /* The engine's entry for the running dasha lord, if the analysis has
       arrived. Everything it carries is derived from this chart. */
    const lordAnalysis = currentDasha && analysis
        ? analysis.find((a: any) => a.planet === currentDasha.lord) ?? null
        : null;

    const lordContext = currentDasha
        ? describeDashaLord(selectedProfile?.chartData, currentDasha.lord)
        : null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <span className="cosmic-label mb-2 inline-block">Gochar & Dasha · Celestial Weather</span>
                <h1 className="mystic-text">Timing & Seasons</h1>
                <div className="sacred-divider"></div>
                <p className={styles.subtitle}>
                    Planetary periods are foundational cycles that influence your capacity to act and perceive.
                </p>
            </header>

            {/* Profile Selector Tabs */}
            {activeProfiles.length > 1 && (
                <div className={styles.profileTabs}>
                    {activeProfiles.map(p => (
                        <button
                            key={p.id}
                            className={`${styles.profileTab} ${selectedProfileId === p.id ? styles.activeTab : ''}`}
                            onClick={() => handleProfileChange(p.id)}
                        >
                            <User size={14} />
                            {p.name}
                        </button>
                    ))}
                </div>
            )}

            {selectedProfile && (
                <div className={styles.selectedInfo}>
                    Viewing timeline for <strong>{selectedProfile.name}</strong>
                </div>
            )}

            {/* Life-theme-first summary block (6.1, 6.2) */}
            {currentDasha && PHASE_THEMES[currentDasha.lord] && (
                <div className={`${styles.phaseSummary} sacred-card`}>
                    <div className={styles.phaseSummaryLabel}>What this phase is asking of you</div>
                    <h2 className={styles.phaseSummaryTheme}>
                        {new Date(currentDasha.start).getFullYear()}–{new Date(currentDasha.end).getFullYear()}: {PHASE_THEMES[currentDasha.lord].theme}
                    </h2>
                    <p className={styles.phaseSummaryText}>{PHASE_THEMES[currentDasha.lord].asking}</p>
                    <p className={styles.phaseSummaryClosing}>
                        This is the energy at play. What you do with it is entirely yours.
                    </p>
                    <p className={styles.phaseSummaryFooter}>
                        Astrologically, this is your <strong>{currentDasha.lord} Mahadasha</strong>
                        {complexity === 'TECHNICAL' ? ' — the technical detail follows below.' : '.'}
                    </p>
                </div>
            )}

            {currentDasha && (
                <div className={`${styles.currentPeriod} sacred-card`}>
                    <div className={styles.periodLabel}>Current Major Phase (<Term termKey="mahadasha">Mahadasha</Term>)</div>
                    <h2 className="mystic-text text-3xl my-2">{currentDasha.lord} Period</h2>
                    <div className={styles.periodDates}>
                        {new Date(currentDasha.start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} —
                        {new Date(currentDasha.end).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </div>

                    {!aiInsight && (
                        <button
                            className="primary-btn-cosmic mt-4"
                            onClick={fetchAiInsight}
                            disabled={fetchingAi}
                        >
                            {fetchingAi ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Zap size={18} />
                            )}
                            {fetchingAi ? 'Scanning Personal Chart...' : 'Reveal Personalized AI Insight'}
                        </button>
                    )}
                </div>
            )}

            {/* AI Insight Section */}
            {aiInsight && (
                <div className={styles.aiInsightSection}>
                    <div className={`${styles.aiCard} sacred-card !border-[var(--accent-gold)]`}>
                        <div className={styles.aiCardHeader}>
                            <Sparkles size={20} className="text-[var(--accent-gold)]" />
                            <h3 className="mystic-text !text-xl">Cosmic Flavor Analysis</h3>
                        </div>
                        <p className={styles.aiContent}>{aiInsight.phaseFlavor}</p>
                    </div>

                    <div className={styles.aiGridSmall}>
                        <div className={styles.aiCardMini}>
                            <div className={styles.aiCardHeaderMini}>
                                <Zap size={16} />
                                <h4>Opportunity Tailwind</h4>
                            </div>
                            <p>{aiInsight.opportunityArea}</p>
                        </div>
                        <div className={styles.aiCardMini}>
                            <div className={styles.aiCardHeaderMini}>
                                <Clock size={16} />
                                <h4>Conscious Practice</h4>
                            </div>
                            <p>{aiInsight.awarenessPractice}</p>
                        </div>
                    </div>
                </div>
            )}

            {!aiInsight && (
                <div className={styles.grid}>
                    {/* First, and the only card here that is about THIS chart.
                        The three that follow describe what the lord means in
                        general — true, but identical for everyone sharing a
                        mahadasha lord. This one is read off the seeker's own
                        stored placement, so it differs between two people in
                        the same period, which is the thing they actually came
                        to find out. */}
                    {lordContext?.placement && (
                        <div className={`${styles.card} ${styles.cardPrimary}`}>
                            <div className={styles.cardHeader}>
                                <User size={18} />
                                <h3>In Your Chart</h3>
                            </div>
                            <p>{lordContext.placement}</p>
                            {lordContext.nakshatra && (
                                <p className={styles.cardMeta}>
                                    Nakshatra: {lordContext.nakshatra}
                                    {lordContext.dignity ? ` · ${lordContext.dignity}` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Sparkles size={18} />
                            <h3>What This Phase Supports</h3>
                        </div>
                        {/* The engine's reading of THIS chart when we have it;
                            the lord-name table only as a fallback. */}
                        <p>{lordAnalysis?.synthesis?.balances_with || interpretation?.supports || "Observing cosmic patterns..."}</p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Info size={18} />
                            <h3>What It Resists</h3>
                        </div>
                        <p>{lordAnalysis?.synthesis?.challenge || interpretation?.resists || "Analyzing celestial friction..."}</p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Calendar size={18} />
                            <h3>Lifecycle Themes</h3>
                        </div>
                        <p>{lordAnalysis?.synthesis?.repeats_when || interpretation?.themes || "Extracting emotional resonance..."}</p>
                        {lordAnalysis && (
                            <p className={styles.cardMeta}>
                                {lordAnalysis.nakshatra} pada {lordAnalysis.nakshatraPada}
                                {' · '}load {lordAnalysis.load} ({lordAnalysis.loadClassification})
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Daily Transits Section (Gochar) */}
            <section className={styles.timelineSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Current Cosmic Weather (Gochar)</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1 tracking-wide">
                        Temporary planetary movements currently interacting with your natal chart.
                    </p>
                </div>
                {transitsLoading ? (
                    <div className={styles.loadingState}><div className={styles.spinner}></div></div>
                ) : transits ? (
                    <>
                        <div className={styles.transitGrid}>
                            {transits.keyTransits.length > 0 ? transits.keyTransits.map((transitText: string, idx: number) => {
                                const [title, rest] = transitText.split(': ');
                                const accent = title.includes('Sade Sati')
                                    ? styles.transitCardSadeSati
                                    : title.includes('Jupiter') ? styles.transitCardJupiter : '';
                                return (
                                    <div key={idx} className={`${styles.transitCard} ${accent}`}>
                                        <h4 className={styles.transitTitle}>{title}</h4>
                                        <p className={styles.transitText}>{rest || transitText}</p>
                                    </div>
                                );
                            }) : (
                                <div className={styles.transitCard}>
                                    <p className={styles.transitText}>No major heavy-planet transits are currently active. Enjoy this period of relative cosmic calm.</p>
                                </div>
                            )}
                        </div>

                        {transits.ashtakavargaScores && transits.ashtakavargaScores.length > 0 && (
                            <div className={styles.avSection}>
                                <h3 className={styles.avHeading}>How today&apos;s sky is treating each planet</h3>
                                <p className={styles.avExplainer}>
                                    Each planet is scored out of 8 for where it is sitting right now
                                    relative to your chart. Higher means the area it governs tends to
                                    move more easily this period; lower means it asks for more effort.
                                    It is a weather reading, not a verdict.
                                </p>
                                <div className={styles.avGrid}>
                                    {transits.ashtakavargaScores.map((av: any) => {
                                        const tone = av.score >= 5 ? styles.avStrong
                                            : av.score <= 3 ? styles.avChallenge : styles.avAverage;
                                        return (
                                            <div key={av.planet} className={styles.avItem}>
                                                <span className={styles.avPlanet}>{av.planet}</span>
                                                <span className={`${styles.avScore} ${tone}`}>
                                                    {av.score}<small>/8</small>
                                                </span>
                                                <span className={`${styles.avQuality} ${tone}`}>{av.quality}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </section>

            {/* Visual horizontal Dasha timeline (6.3) */}
            {dashas.length > 0 && <DashaTimeline dashas={dashas} />}

            <section className={styles.timelineSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Extended Timeline Analysis</h2>
                </div>
                {loading ? (
                    <div className="flex justify-center p-12 opacity-50">
                        <div className={styles.spinner}></div>
                    </div>
                ) : (
                    <DashaDisplay dashas={dashas} />
                )}
            </section>

            <DisclaimerNote />
        </div>
    );
}
