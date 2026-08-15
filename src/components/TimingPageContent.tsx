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
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Sparkles size={18} />
                            <h3>What This Phase Supports</h3>
                        </div>
                        <p>{interpretation?.supports || "Observing cosmic patterns..."}</p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Info size={18} />
                            <h3>What It Resists</h3>
                        </div>
                        <p>{interpretation?.resists || "Analyzing celestial friction..."}</p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Calendar size={18} />
                            <h3>Lifecycle Themes</h3>
                        </div>
                        <p>{interpretation?.themes || "Extracting emotional resonance..."}</p>
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
                    <div className="flex justify-center p-8 opacity-50"><div className={styles.spinner}></div></div>
                ) : transits ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {transits.keyTransits.length > 0 ? transits.keyTransits.map((transitText: string, idx: number) => {
                            const [title, rest] = transitText.split(': ');
                            const isSadeSati = title.includes('Sade Sati');
                            const isJupiter = title.includes('Jupiter');
                            return (
                                <div key={idx} className={`${styles.card} border-l-4 ${isSadeSati ? 'border-amber-500' : isJupiter ? 'border-green-500' : 'border-[var(--primary)]'}`}>
                                    <h4 className="font-semibold text-[var(--primary)] text-sm mb-1 uppercase tracking-wider">{title}</h4>
                                    <p className="text-sm text-[var(--foreground)]">{rest || transitText}</p>
                                </div>
                            );
                        }) : (
                            <div className={`${styles.card} col-span-full text-center py-8 opacity-70`}>
                                <p>No major heavy-planet transits are currently active. Enjoy this period of relative cosmic calm.</p>
                            </div>
                        )}

                        {transits.ashtakavargaScores && transits.ashtakavargaScores.length > 0 && (
                            <div className="col-span-full mt-6">
                                <h3 className="font-semibold text-[var(--primary)] mb-4 uppercase tracking-widest text-sm">Ashtakavarga Transit Strengths</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {transits.ashtakavargaScores.map((av: any) => (
                                        <div key={av.planet} className={`${styles.card} flex flex-col items-center p-4 text-center`} title={av.meaning}>
                                            <span className="font-bold text-md">{av.planet}</span>
                                            <div className="text-3xl font-light my-2" style={{ color: av.score >= 5 ? 'var(--success, #4ade80)' : av.score <= 3 ? 'var(--error, #f87171)' : 'var(--primary)' }}>
                                                {av.score}<span className="text-sm text-[var(--text-muted)]">/8</span>
                                            </div>
                                            <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: av.score >= 5 ? 'var(--success, #4ade80)' : av.score <= 3 ? 'var(--error, #f87171)' : 'var(--secondary)' }}>
                                                {av.quality}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
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
