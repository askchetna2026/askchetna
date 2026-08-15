'use client';

import Link from 'next/link';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import BirthDataForm, { UserProfile } from '@/components/BirthDataForm';
import ChartDisplay from '@/components/ChartDisplay';
import ChartZoom from '@/components/ChartZoom';
import DashaDisplay from '@/components/DashaDisplay';
import ProfileTabs from '@/components/ProfileTabs';
// import ProfileDrawer from '@/components/ProfileDrawer'; // Moved to global context
// import ProfileLimitModal from '@/components/ProfileLimitModal'; // Moved to global context
// From './zodiac', never './calculator' — the latter carries the 16.8 MB
// ephemeris into the browser bundle. See the header of zodiac.ts.
import { ChartData, getZodiacSign, getNakshatra } from '@/lib/astrology/zodiac';
import {
    PLANET_SORT_ORDER,
    SIGN_LORDS,
    getSignIndex,
    getHouseNumber,
    formatDegree,
    getAspects,
    getConjunctions
} from '@/lib/astrology/interpretations';
import styles from './ChartPageContent.module.css';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/context/ProfileContext';
import { getProfiles, refreshProfiles } from '@/lib/profileStore';
import { useComplexity } from '@/context/ComplexityContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, ArrowLeft, Lock, Info, CheckCircle, Sparkles, Zap, Loader2, Download, Clock, Compass, Copy, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';
import { buildPricingUrl } from '@/lib/monetization';
import Term from '@/components/Term';
import DisclaimerNote from '@/components/DisclaimerNote';
import ShareChartCard from '@/components/ShareChartCard';

import { VARGA_DEFINITIONS, VARGA_CATEGORIES, getPersonalizedInterpretation } from "@/lib/astrology/vargaContent";

export default function ChartPageContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Profile Management State
    const [activeProfiles, setActiveProfiles] = useState<UserProfile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [profileLimit, setProfileLimit] = useState(5);
    const [canAddMore, setCanAddMore] = useState(true);
    const { openNewProfileModal } = useProfile();
    const { complexity } = useComplexity();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [activeChart, setActiveChart] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState<string | null>(null);
    const [serviceCosts, setServiceCosts] = useState<Record<string, number>>({});
    const [confirmModal, setConfirmModal] = useState<{ show: boolean; chartKey: string; cost: number } | null>(null);
    const [noCreditsModal, setNoCreditsModal] = useState(false);
    const [blockedUnlockContext, setBlockedUnlockContext] = useState<{ chartKey: string; cost: number } | null>(null);
    const [initializing, setInitializing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Abundance');
    const [isExporting, setIsExporting] = useState(false);
    const [aiInsights, setAiInsights] = useState<Record<string, Record<string, string>>>({});
    const [isFetchingAi, setIsFetchingAi] = useState(false);
    /** Profiles the varga backfill has already run for, once per page load. */
    const backfilledProfileIds = useRef<Set<string>>(new Set());
    /** Honours the OS "reduce motion" setting for the header entrance. */
    const reduceMotion = useReducedMotion();

    // The single profile load for this page.
    //
    // There used to be a second one — GET /api/user/profile — running in
    // parallel, and both wrote `profile`. They resolve to the same row in the
    // ordinary case (both take the newest active profile), so the duplicate
    // request was mostly invisible; it stopped being invisible when the two
    // disagreed, because whichever landed second won, and a profile without
    // vargas landing second re-armed the backfill below.
    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            setLoading(false);
            return;
        }
        fetchActiveProfiles();
    }, [status]);

    const fetchActiveProfiles = async () => {
        try {
            // Through the shared store: paints from localStorage on any visit
            // after the first, and shares one request with the other components
            // on this page instead of issuing a second identical one. The chart
            // is immutable for a profile, so a cached read cannot be wrong
            // about what it says — only about which profiles exist, which the
            // background revalidation then corrects.
            const data = await getProfiles((fresh) => applyProfiles(fresh));
            applyProfiles(data);
        } catch (error) {
            console.error('Failed to fetch active profiles:', error);
        } finally {
            setLoading(false);
        }
    };

    /** Shared by the cached first paint and the background revalidation. */
    const applyProfiles = (data: Awaited<ReturnType<typeof getProfiles>>) => {
        if (!data) return;

        setActiveProfiles((data.profiles || []) as UserProfile[]);
        setProfileLimit(data.limit || 5);
        setCanAddMore(data.canAddMore || false);

        const profileIdFromUrl = searchParams.get('profileId');
        let targetProfile: UserProfile | null = null;

        if (profileIdFromUrl) {
            targetProfile = ((data.profiles || []) as UserProfile[])
                .find((p) => p.id === profileIdFromUrl) ?? null;
        }
        if (!targetProfile && (data.profiles || []).length > 0) {
            targetProfile = (data.profiles as UserProfile[])[0];
        }

        if (targetProfile) {
            setSelectedProfile(targetProfile);
            setProfile(targetProfile);
            if (targetProfile.chartData) {
                setChartData(targetProfile.chartData as ChartData);
            }
        }
    };

    useEffect(() => {
        async function fetchCosts() {
            try {
                const res = await fetch('/api/services');
                if (res.ok) {
                    const data = await res.json();
                    const costs: Record<string, number> = {};
                    data.forEach((s: any) => costs[s.key] = s.credits);
                    setServiceCosts(costs);
                }
            } catch (e) {
                console.error('Failed to fetch service costs:', e);
            }
        }
        fetchCosts();
    }, []);

    const toggleChartDetails = (key: string) => {
        if (activeChart === key) {
            setActiveChart(null);
        } else {
            setActiveChart(key);
            setActiveTab(0);
            // Fetch AI insights if not already cached
            if (!aiInsights[key] && profile?.chartData?.vargas?.[key]) {
                fetchPlanetInsights(key, profile.chartData.vargas[key] as unknown as ChartData);
            }
        }
    };

    const fetchPlanetInsights = async (chartKey: string, chartData: ChartData) => {
        setIsFetchingAi(true);
        try {
            const res = await fetch('/api/ai/planet-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chartData,
                    chartName: VARGA_DEFINITIONS[chartKey]?.title || chartKey,
                    complexity
                })
            });
            if (res.ok) {
                const data = await res.json();
                setAiInsights(prev => ({ ...prev, [chartKey]: data.insights }));
            }
        } catch (e) {
            console.error('Failed to fetch AI insights:', e);
        } finally {
            setIsFetchingAi(false);
        }
    };

    // Auto-sync for legacy profiles.
    //
    // Guarded by profile id: this effect depends on `profile`, which the
    // backfill itself replaces, so an attempt that does not produce vargas
    // would otherwise re-trigger it forever — recalculating on every render
    // pass for as long as the page is open.
    useEffect(() => {
        // No id means nothing to PATCH against, so there is no backfill to do.
        if (!profile?.id || loading || initializing) return;
        if (profile.chartData?.vargas) return;
        if (backfilledProfileIds.current.has(profile.id)) return;

        backfilledProfileIds.current.add(profile.id);
        handleInitializeVargas();
    }, [profile, initializing, loading]);

    // Reset AI insights when switching profiles to prevent data leakage
    useEffect(() => {
        if (profile?.id) {
            setAiInsights({});
            setActiveChart(null);
        }
    }, [profile?.id]);


    const handleUnlockChart = (chartKey: string) => {
        if (!profile) return;
        const cost = serviceCosts[`CHART_${chartKey}`] || 5;
        // Check if user has enough credits (assuming we have credit balance in profile)
        // For now, we'll let the server decide 402, but we show the confirmation first
        setConfirmModal({ show: true, chartKey, cost });
    };

    const confirmUnlock = async () => {
        if (!confirmModal || !profile) return;
        const { chartKey, cost } = confirmModal;
        setConfirmModal(null);
        setUnlocking(chartKey);

        try {
            const res = await fetch(`/api/profiles/${profile.id}/charts/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chartKey })
            });

            if (res.ok) {
                const data = await res.json();
                setProfile({ ...profile, unlockedCharts: data.unlockedCharts });
                setBlockedUnlockContext(null);
                // Automatically open the chart details after unlock
                setActiveChart(chartKey);
            } else {
                const err = await res.json();
                if (res.status === 402) {
                    setBlockedUnlockContext({ chartKey, cost });
                    setNoCreditsModal(true);
                } else {
                    alert('Unlock failed: ' + (err.error || 'Unknown error'));
                }
            }
        } catch (error) {
            alert('Error unlocking chart');
        } finally {
            setUnlocking(null);
        }
    };

    const handleInitializeVargas = async () => {
        if (!profile) return;
        setInitializing(true);
        try {
            const dob = new Date(profile.dateOfBirth);
            const body = {
                year: dob.getFullYear(),
                month: dob.getMonth() + 1,
                day: dob.getDate(),
                hour: parseInt(profile.timeOfBirth.split(':')[0]),
                minute: parseInt(profile.timeOfBirth.split(':')[1]),
                lat: profile.latitude,
                lng: profile.longitude
            };

            const calcRes = await fetch('/api/astrology/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!calcRes.ok) throw new Error('Calculation failed');
            const fullData = await calcRes.json();

            // PATCH, not POST. This backfills a chart onto an existing profile;
            // POST /api/profiles creates, so every run used to leave behind a
            // duplicate profile and, at the limit, deactivate the oldest one.
            // Only the chart is sent — the birth details it was derived from
            // are the ones already on the row.
            const saveRes = await fetch(`/api/profiles/${profile.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chartData: fullData })
            });

            if (!saveRes.ok) throw new Error('Failed to save the recalculated chart');
            setProfile({ ...profile, chartData: fullData });
            // The stored copy just changed, so the cached one is now wrong.
            void refreshProfiles();
        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Could not synchronize your advanced charts. Please try updating your birth details manually.');
        } finally {
            setInitializing(false);
        }
    };

    // Profile Management Handlers
    const handleSelectProfile = (profileId: string) => {
        const profile = activeProfiles.find(p => p.id === profileId);
        if (profile) {
            setSelectedProfile(profile);
            setProfile(profile);
            if (profile.chartData) {
                setChartData(profile.chartData as ChartData);
            }
            // Update URL
            router.push(`/chart?profileId=${profileId}`);
        }
    };


    const handleChartGenerated = async (data: ChartData) => {
        try {
            await fetchActiveProfiles();
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="spinner-centre">
                <div className="spinner" role="status" aria-label="Loading" />
            </div>
        );
    }

    if (!profile && !loading) {
        return (
            <div className={`container ${styles.pageContainer}`}>
                <div className="max-w-2xl mx-auto text-center mb-12">
                    <h1 className={styles.title}>Welcome to AskChetna</h1>
                    <p className={styles.subtitle}>
                        To verify the stars, we first need to know where you stand. <br />
                        Please enter your birth details to begin your journey.
                    </p>
                </div>
                <div className={styles.formWrapper}>
                    <BirthDataForm onChartGenerated={handleChartGenerated} />
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className={`container ${styles.pageContainer}`}>
                <div className={styles.headerRow}>
                    <div className="text-left">
                        <h1 className={styles.title}>Update Profile</h1>
                        <p className={styles.subtitle}>Modify your birth details to update your charts.</p>
                    </div>
                    <button onClick={() => setIsEditing(false)} className={styles.backLinkBtn}>
                        <ArrowLeft size={16} />
                        Back to Chart
                    </button>
                </div>
                <div className={styles.formWrapper}>
                    <BirthDataForm onChartGenerated={handleChartGenerated} initialData={profile!} />
                </div>
            </div>
        );
    }

    const freeCharts = ['D1', 'D9', 'Moon'];
    const unlockedCharts = (profile?.unlockedCharts as string[]) || [];
    const hasVargas = !!profile?.chartData?.vargas;
    const hasPurchaseSuccess = searchParams.get('purchase') === 'success';
    const purchaseIntent = searchParams.get('purchaseIntent');
    const currentProfileId = selectedProfile?.id ?? profile?.id ?? searchParams.get('profileId');
    const chartReturnTo = currentProfileId ? `/chart?profileId=${currentProfileId}` : '/chart';
    const highlightedChartKey = blockedUnlockContext?.chartKey ?? searchParams.get('focus');
    const highlightedChartTitle = highlightedChartKey
        ? (VARGA_DEFINITIONS[highlightedChartKey]?.title || highlightedChartKey)
        : null;
    const chartUnlockPricingUrl = buildPricingUrl({
        intent: 'chart_unlock',
        source: blockedUnlockContext ? 'chart_unlock_blocked' : 'chart_unlock_topup',
        returnTo: chartReturnTo,
        focus: highlightedChartKey,
    });

    const renderVargaCard = (key: string, isTrinity = false) => {
        const info = VARGA_DEFINITIONS[key] || { title: key, definition: 'Advanced divisional analysis', tips: 'Refining cosmic insights' };
        const isUnlocked = VARGA_CATEGORIES['Foundation'].includes(key) ||
            unlockedCharts.includes(key) ||
            (session?.user as any)?.isAdmin;
        const vargaData = profile?.chartData?.vargas?.[key];
        const isExpanded = activeChart === key;
        const creditCost = serviceCosts[`CHART_${key}`] || 5;

        return (
            <div key={key} className={styles.cardContainer}>
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: isTrinity ? -12 : -4 }}
                    className={isTrinity ? styles.trinityCard : styles.vargaCard}
                >
                    {!isUnlocked && (
                        <div className={styles.lockOverlay}>
                            <button
                                className={styles.unlockBtn}
                                onClick={() => handleUnlockChart(key)}
                                disabled={unlocking === key}
                            >
                                {unlocking === key ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    `Unlock for ${creditCost} Credits`
                                )}
                            </button>
                        </div>
                    )}

                    <div className={styles.vargaHeader}>
                        <h3 className={styles.vargaTitle}>{info.title}</h3>
                        {isUnlocked ? <CheckCircle size={16} color="var(--accent-gold)" /> : <span className={styles.vargaTag}>Premium</span>}
                    </div>

                    {isUnlocked && vargaData && (
                        <>
                            <div className={styles.centerRow}>
                                {/* 220px inside a 321px grid column wasted a third of
                                    every cell and made each thumbnail harder to read
                                    than it needed to be. The grid owns the size. */}
                                <ChartDisplay data={vargaData} width="100%" height="auto" />
                            </div>

                            <button
                                className={`${styles.analysisBtn} ${isExpanded ? styles.active : ''}`}
                                onClick={() => toggleChartDetails(key)}
                            >
                                {isExpanded ? 'Hide Details' : 'View Detailed Insights'}
                                {isExpanded ? <PlusCircle className="rotate-45" size={16} /> : <Zap size={16} />}
                            </button>
                        </>
                    )}

                    {!isUnlocked && (
                        <div className="p-8 text-center opacity-40">
                            <p className="italic leading-relaxed">{info.definition.substring(0, 100)}...</p>
                            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--accent-gold)]">
                                Unlock to read the full analysis
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    };

    return (
        <div className={`container ${styles.pageContainer}`}>
            {/* The varga cards below animate in, but the header did not, so
                opening /chart the page's whole top half simply appeared. The
                cards' own entrance is easy to miss because it happens while the
                eye is still on the header. */}
            <motion.div
                className={styles.headerRowEnd}
                initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            >
                <div className="text-left w-full">
                    {/* Page orientation, at page level rather than inside a card.
                        /chart had no h1 at all — the only heading was this title
                        nested two levels into the birth-details card, so the
                        document started at h2 and the page never said plainly
                        what it was. `cosmic-label` was carrying that job as a
                        styled span, which is presentation standing in for
                        structure. */}
                    <h1 className={styles.pageHeading}>
                        {profile ? `${profile.name}'s birth chart` : 'Your birth chart'}
                    </h1>
                    <p className={styles.pageLede}>
                        The sky at the moment you were born, and what each division of it describes.
                    </p>
                    {profile && (
                        <div className={`${styles.chartInfoCard} sacred-card`}>
                            <div className={styles.chartInfoContent}>
                                <h2 className={styles.chartInfoTitle}>
                                    Cosmic blueprint for {profile.name} • {new Date(profile.dateOfBirth).toLocaleDateString()}
                                </h2>
                                <div className="sacred-divider ml-0 justify-start mb-4"></div>
                                {profile.chartData && (
                                    <div className={styles.chartInfoGrid}>
                                        <div><span className="text-[var(--primary-dark)]">Birth Time:</span> {(function (t) {
                                            if (!t) return 'Unknown';
                                            const [h, m] = t.split(':');
                                            const H = parseInt(h);
                                            const ampm = H >= 12 ? 'PM' : 'AM';
                                            const H12 = H % 12 || 12;
                                            return `${H12}:${m} ${ampm}`;
                                        })(profile.timeOfBirth)}</div>
                                        <div><span className="text-[var(--primary-dark)]">Birth Place:</span> {profile.placeOfBirth}</div>
                                        <div><span className="text-[var(--primary-dark)]"><Term termKey="ascendant">Ascendant</Term> Sign:</span> {getZodiacSign(profile.chartData.ascendant)}</div>
                                        <div><span className="text-[var(--primary-dark)]"><Term termKey="moonsign">Moon Sign</Term>:</span> {getZodiacSign(profile.chartData.planets.Moon.longitude)}</div>
                                        <div><span className="text-[var(--primary-dark)]">Western Zodiac:</span> {(function (d) {
                                            const m = d.getMonth() + 1, da = d.getDate();
                                            if ((m == 3 && da >= 21) || (m == 4 && da <= 19)) return "Aries";
                                            if ((m == 4 && da >= 20) || (m == 5 && da <= 20)) return "Taurus";
                                            if ((m == 5 && da >= 21) || (m == 6 && da <= 20)) return "Gemini";
                                            if ((m == 6 && da >= 21) || (m == 7 && da <= 22)) return "Cancer";
                                            if ((m == 7 && da >= 23) || (m == 8 && da <= 22)) return "Leo";
                                            if ((m == 8 && da >= 23) || (m == 9 && da <= 22)) return "Virgo";
                                            if ((m == 9 && da >= 23) || (m == 10 && da <= 22)) return "Libra";
                                            if ((m == 10 && da >= 23) || (m == 11 && da <= 21)) return "Scorpio";
                                            if ((m == 11 && da >= 22) || (m == 12 && da <= 21)) return "Sagittarius";
                                            if ((m == 12 && da >= 22) || (m == 1 && da <= 19)) return "Capricorn";
                                            if ((m == 1 && da >= 20) || (m == 2 && da <= 18)) return "Aquarius";
                                            return "Pisces";
                                        })(new Date(profile.dateOfBirth))}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className={styles.subtitle}>

                        {hasPurchaseSuccess && purchaseIntent === 'chart_unlock' && (
                            <div className={styles.purchaseNotice}>
                                <div className={styles.purchaseNoticeText}>
                                    <strong>Credits added.</strong>{' '}
                                    {highlightedChartTitle
                                        ? `You can now return to ${highlightedChartTitle} and unlock its premium interpretation.`
                                        : 'You can now continue unlocking premium chart interpretations without leaving this flow.'}
                                </div>
                                {highlightedChartKey && (
                                    <button
                                        type="button"
                                        className={styles.purchaseNoticeBtn}
                                        onClick={() => handleUnlockChart(highlightedChartKey)}
                                    >
                                        Resume Unlock
                                    </button>
                                )}
                            </div>
                        )}

                        {hasPurchaseSuccess && purchaseIntent === 'profile_expansion' && (
                            <div className={styles.purchaseNotice}>
                                <div className={styles.purchaseNoticeText}>
                                    <strong>Credits added.</strong> You can now expand your profile capacity and continue working across more charts.
                                </div>
                                <button
                                    type="button"
                                    className={styles.purchaseNoticeBtn}
                                    onClick={() => void openNewProfileModal()}
                                >
                                    Add Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* One group, not four siblings. These were flat children of the
                    header's flex row, so space-between strung them across it and
                    the last one overflowed the container entirely. */}
                <div className={styles.headerActions}>
                {activeProfiles.length > 0 && (
                    <ProfileTabs
                        profiles={activeProfiles}
                        activeProfileId={selectedProfile?.id}
                        onSelectProfile={handleSelectProfile}
                        onAddProfile={openNewProfileModal} // Use Context
                        onUpgradeLimit={openNewProfileModal} // Use Context (it handles logic)
                        canAddMore={canAddMore}
                        currentCount={activeProfiles.length}
                        maxProfiles={profileLimit}
                    />
                )}

                <button onClick={() => setIsEditing(true)} className={styles.addProfileBtn}>
                    <PlusCircle size={18} />
                    Refine Birth Details
                </button>

                <Link
                    href={`/timing?profileId=${selectedProfile?.id}`}
                    className={styles.addProfileBtn}
                >
                    <Clock size={18} />
                    View Timeline
                </Link>

                {profile?.chartData && <ShareChartCard profile={profile} />}
                </div>
            </motion.div>

            {!hasVargas && (
                <div className={`${styles.initializeSection} sacred-card`}>
                    <Sparkles size={32} className="mx-auto text-[var(--accent-gold)] mb-4" />
                    <h2 className="mystic-text">Advanced Insights Available</h2>
                    <p>Your profile needs one-time synchronization to unlock 16 additional divisional charts.</p>
                    <button
                        className={styles.initializeBtn}
                        onClick={handleInitializeVargas}
                        disabled={initializing}
                    >
                        {initializing ? 'Synchronizing...' : 'Sync Evolutionary Charts'}
                    </button>
                </div>
            )}

            {hasVargas && (
                <div className={styles.stackLg}>
                    {/* Trinity Section (Always Visible) */}
                    <div className={styles.trinitySection}>
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: { transition: { staggerChildren: 0.1 } }
                            }}
                            className={styles.trinityGrid}
                        >
                            {VARGA_CATEGORIES['Foundation'].map(key => renderVargaCard(key, true))}
                        </motion.div>
                    </div>

                    {/* Varga Categories Section */}
                    <div className={styles.categoryNav}>
                        {Object.keys(VARGA_CATEGORIES).filter(c => c !== 'Foundation').map(cat => (
                            <button
                                key={cat}
                                className={`${styles.categoryBtn} ${activeCategory === cat ? styles.active : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCategory}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className={styles.vargaGrid}
                        >
                            {VARGA_CATEGORIES[activeCategory].map(key => renderVargaCard(key))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* Unlock Confirmation Modal */}
            <AnimatePresence>
                {confirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.modalOverlay}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className={styles.dialogBox}
                        >
                            <h3 className={styles.dialogTitle}>Unlock {VARGA_DEFINITIONS[confirmModal.chartKey]?.title}?</h3>
                            <p className={styles.dialogText}>
                                This detailed analysis will reveal deep insights into your life path.
                                <br />
                                <strong>Cost: {confirmModal.cost} Credits</strong>
                            </p>
                            <div className={styles.dialogActions}>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className={styles.btnCancel}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmUnlock}
                                    className={styles.btnConfirm}
                                >
                                    Confirm Unlock
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Insufficient Credits Modal */}
            <AnimatePresence>
                {noCreditsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.modalOverlay}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className={styles.dialogBox}
                        >
	                            <h3 className={styles.dialogTitle} style={{ color: '#ff4747' }}>Insufficient Credits</h3>
	                            <p className={styles.dialogText}>
	                                {PAYMENTS_ENABLED
	                                    ? 'You need more credits to unlock this premium chart analysis.'
	                                    : PAYMENTS_PAUSED_MESSAGE}
	                            </p>
	                            <div className={styles.dialogActions}>
	                                <button
	                                    onClick={() => setNoCreditsModal(false)}
	                                    className={styles.btnCancel}
	                                >
	                                    Close
	                                </button>
                                {PAYMENTS_ENABLED && (
                                    <button
                                        onClick={() => {
                                            setNoCreditsModal(false);
                                            router.push(chartUnlockPricingUrl);
                                        }}
                                        className={styles.btnPremium}
                                    >
                                        Top Up and Return
                                    </button>
                                )}
	                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fixed Analysis Bottom Drawer */}
            <AnimatePresence>
                {activeChart && profile?.chartData?.vargas?.[activeChart] && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={styles.analysisDrawer}
                    >
                        {/* Drawer Header */}
                        <div className={styles.drawerHeader}>
                            <div className={styles.drawerHeaderLeft}>
                                <h3>{VARGA_DEFINITIONS[activeChart]?.title}</h3>
                                <span className={styles.drawerSubtitle}>Detailed Analysis</span>
                            </div>
                            <div className={styles.drawerControls}>
                                <button
                                    className={styles.exportBtn}
                                    onClick={async () => {
                                        setIsExporting(true);

                                        try {
                                            // 1. Capture Chart Image (Higher Quality & Print Friendly)
                                            // USING onclone TO AVOID WEB REGRESSION
                                            let chartImageBase64 = null;
                                            try {
                                                const chartElement = document.querySelector(`.${styles.chartWrapper}`) as HTMLElement;
                                                if (chartElement) {
                                                    const canvas = await html2canvas(chartElement, {
                                                        scale: 4,
                                                        backgroundColor: null,
                                                        logging: false,
                                                        useCORS: true,
                                                        onclone: (clonedDoc) => {
                                                            const wrapper = clonedDoc.querySelector(`.${styles.chartWrapper}`) as HTMLElement;
                                                            if (wrapper) {
                                                                // Print Styling (Applied ONLY to clone)
                                                                wrapper.style.background = '#ffffff';
                                                                wrapper.style.color = '#000000';
                                                                wrapper.style.border = 'none';
                                                                wrapper.style.boxShadow = 'none';

                                                                // Force explicit black for all variables
                                                                wrapper.style.setProperty('--primary', '#000000');
                                                                wrapper.style.setProperty('--foreground', '#000000');
                                                                wrapper.style.setProperty('--accent-gold', '#000000');
                                                                wrapper.style.setProperty('--card-bg', '#ffffff');

                                                                // Aggressively target all text and lines
                                                                const allElements = wrapper.querySelectorAll('*');
                                                                allElements.forEach((el: any) => {
                                                                    const style = window.getComputedStyle(el);
                                                                    // Force text to black and bold if it's text
                                                                    if (el.innerText && el.children.length === 0) {
                                                                        el.style.color = '#000000';
                                                                        el.style.fontWeight = '600'; // Bold for clarity
                                                                        el.style.textShadow = 'none';
                                                                    }
                                                                    // Force SVG strokes/fills
                                                                    if (el.tagName === 'path' || el.tagName === 'circle' || el.tagName === 'line') {
                                                                        const stroke = el.getAttribute('stroke');
                                                                        if (stroke && stroke !== 'none') {
                                                                            el.style.stroke = '#000000';
                                                                            el.style.strokeWidth = '1.5px';
                                                                        }
                                                                    }
                                                                    if (el.tagName === 'text') {
                                                                        el.style.fill = '#000000';
                                                                        el.style.fontWeight = 'bold';
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    });
                                                    chartImageBase64 = canvas.toDataURL('image/png', 1.0);
                                                }
                                            } catch (imgErr) {
                                                console.error("Image capture failed", imgErr);
                                            }




                                            // 2. Gather text
                                            const chartDef = VARGA_DEFINITIONS[activeChart];
                                            const story = getPersonalizedInterpretation(activeChart, profile.chartData?.vargas?.[activeChart], profile.name);

                                            // 3. Payload
                                            const payload = {
                                                chartKey: activeChart,
                                                chartTitle: chartDef?.title || `${activeChart} Analysis`, // Send full title
                                                profileId: profile.id,
                                                chartData: profile.chartData?.vargas?.[activeChart],
                                                userDetails: {
                                                    name: profile.name,
                                                    dob: profile.dateOfBirth,
                                                    time: profile.timeOfBirth,
                                                    place: profile.placeOfBirth,
                                                    lat: profile.latitude,
                                                    lng: profile.longitude,
                                                    generatedAt: profile.createdAt // Send creation date for consistency
                                                },
                                                texts: {
                                                    definition: chartDef?.definition,
                                                    tips: chartDef?.tips,
                                                    story: story
                                                },
                                                chartImage: chartImageBase64
                                            };

                                            const res = await fetch('/api/charts/export', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(payload)
                                            });

                                            if (res.ok) {
                                                const blob = await res.blob();
                                                const filename = `Chetna_Report_${activeChart}_${profile.name.replace(/\s+/g, '_')}.pdf`;
                                                
                                                const { isClientNativeApp } = await import('@/lib/platform');
                                                if (isClientNativeApp()) {
                                                    const { shareContent } = await import('@/lib/native/share');
                                                    const outcome = await shareContent({
                                                        title: 'Chetna Chart Report',
                                                        text: 'Here is your Chetna Chart Report.',
                                                        file: { blob, name: filename }
                                                    });
                                                    
                                                    if (outcome === 'failed') {
                                                        alert('Failed to save or share PDF');
                                                    }
                                                } else {
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = filename;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    window.URL.revokeObjectURL(url);
                                                }
                                            } else {
                                                alert('Failed to generate PDF');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert('Error exporting PDF');
                                        } finally {
                                            setIsExporting(false);
                                        }
                                    }}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <><Loader2 className="animate-spin" size={18} /> Generating...</>
                                    ) : (
                                        <><Download size={18} /> Export Full Report</>
                                    )}
                                </button>
                                <button onClick={() => setActiveChart(null)} className={styles.drawerClose}>
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className={styles.drawerContent}>
                            {/* Left: Chart Visualization */}
                            <div className={styles.drawerChart}>
                                <div className={styles.chartWrapper}>
                                    {/* Was pinned to 280px on every screen, so a
                                        1372px desktop showed the chart at the size a
                                        phone did. It now fills the column, and the
                                        column is capped in CSS. */}
                                    <ChartZoom>
                                        <ChartDisplay data={profile.chartData.vargas[activeChart]} width="100%" height="auto" />
                                    </ChartZoom>
                                </div>
                            </div>

                            {/* Right: Tabbed Info */}
                            <div className={styles.drawerTabs}>
                                <div className={styles.tabButtons}>
                                    {/* Two labels each, one shown per breakpoint. "Planet
                                        Placement & Expression" is 28 characters; three of
                                        those need 539px, which is wider than a phone, and
                                        the strip used to scroll sideways to cope. Swapping
                                        the copy is the honest fix — a scrollbar is what you
                                        add when the words refuse to shrink. Rendering both
                                        and hiding one in CSS keeps it free of a media query
                                        in JS, which would mismatch during hydration. */}
                                    {[
                                        { full: 'Overview', short: 'Overview' },
                                        { full: 'Your Story', short: 'Story' },
                                        { full: 'Planet Placement & Expression', short: 'Placements' },
                                    ].map((tab, idx) => (
                                        <button
                                            key={tab.full}
                                            className={`${styles.tabButton} ${activeTab === idx ? styles.activeTabButton : ''}`}
                                            onClick={() => setActiveTab(idx)}
                                        >
                                            <span className={styles.tabLabelFull}>{tab.full}</span>
                                            <span className={styles.tabLabelShort}>{tab.short}</span>
                                        </button>
                                    ))}
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className={styles.tabPanel}
                                    >
                                        {/* Overview */}
                                        {activeTab === 0 && (
                                            <div className={styles.tabSection}>
                                                <h4><Info size={18} /> Understanding this Chart</h4>
                                                <p>
                                                    Astrology is a map of consciousness, not a set of fixed predictions. Each chart represents a different layer of your internal landscape, offering insights into how you process energy, respond to challenges, and find equilibrium.
                                                    This specific divisional chart helps you bridge the gap between your physical reality and your spiritual potential.
                                                </p>
                                                <div className={styles.stackSm}>
                                                    <div className={styles.significanceBox}>
                                                        <h5 className={styles.significanceTitle}>Core Significance</h5>
                                                        <p className={styles.significanceText}>{VARGA_DEFINITIONS[activeChart]?.definition}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Your Story */}
                                        {activeTab === 1 && (
                                            <div className={`${styles.tabSection} ${styles.highlightTab}`}>
                                                {getPersonalizedInterpretation(activeChart, profile.chartData.vargas[activeChart], profile.name).map((section: any) => (
                                                    <div key={section.title} className={styles.storySection}>
                                                        <h5>{section.title}</h5>
                                                        <p className={styles.storyQuestion}>{section.question}</p>
                                                        <p className={styles.storyText}>{section.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 2 && (
                                            <div className={styles.tabSection}>
                                                <h4>Planet Placement & Expression</h4>
                                                <p>
                                                    This section reveals the refined state of each planetary energy in this specific department of your life.
                                                    It details the sign, house, and precise degree of each planet, offering a granular view of your karmic map.
                                                </p>
                                                <div className={styles.tableWrapper} style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                                                    <table className={styles.modernTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>Planet</th>
                                                                <th>Sign</th>
                                                                <th>Sign Lord</th>
                                                                <th>Degree</th>
                                                                <th>House</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {PLANET_SORT_ORDER.map(pName => {
                                                                const varga = profile.chartData?.vargas?.[activeChart];
                                                                if (!varga) return null;
                                                                let pData = null;
                                                                if (pName === 'Ascendant') {
                                                                    pData = { name: 'Ascendant', longitude: varga.ascendant, isAsc: true };
                                                                } else {
                                                                    pData = varga.planets?.[pName];
                                                                }

                                                                if (!pData) return null;

                                                                const signIndex = Math.floor(pData.longitude / 30);
                                                                const signName = getZodiacSign(pData.longitude);
                                                                const signLord = SIGN_LORDS[signName] || '-';
                                                                const ascIndex = Math.floor((varga.ascendant || 0) / 30);
                                                                const house = getHouseNumber(signIndex, ascIndex);
                                                                const degree = formatDegree(pData.longitude);

                                                                return (
                                                                    <tr key={pName}>
                                                                        <td className={styles.planetLabel}>{pName}</td>
                                                                        <td>{signName}</td>
                                                                        <td>{signLord}</td>
                                                                        <td className={styles.degreeLabel}>{degree}</td>
                                                                        <td>{house}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className={styles.insightCardGrid}>
                                                    <div className={styles.detailedAnalysisHeader}>
                                                        <h3 className={styles.detailedAnalysisTitle}>Planetary Detailed Analysis</h3>
                                                        {isFetchingAi && (
                                                            <div className={styles.aiReflecting}>
                                                                <Sparkles size={14} />
                                                                <span>AI Reflecting...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {PLANET_SORT_ORDER.filter(p => p !== 'Ascendant').map(pName => {
                                                        const varga = profile.chartData?.vargas?.[activeChart!];
                                                        if (!varga) return null;
                                                        const pData = varga.planets?.[pName];
                                                        if (!pData) return null;

                                                        const signIndex = Math.floor(pData.longitude / 30);
                                                        const signName = getZodiacSign(pData.longitude);
                                                        const ascIndex = Math.floor((varga.ascendant || 0) / 30);
                                                        const house = getHouseNumber(signIndex, ascIndex);

                                                        const getOrdinal = (n: number) => {
                                                            const s = ["th", "st", "nd", "rd"];
                                                            const v = n % 100;
                                                            return s[(v - 20) % 10] || s[v] || s[0];
                                                        };

                                                        const aspects = getAspects(pName, signIndex, varga.planets);
                                                        const conjunctions = getConjunctions(pName, signIndex, varga.planets);

                                                        const aspectText = aspects.length > 0 ? `It receives aspects from ${aspects.join(', ')}.` : 'It is not aspected by major planets.';
                                                        const conjunctText = conjunctions.length > 0 ? `It is conjunct with ${conjunctions.join(', ')}.` : 'It stands alone in this sign.';

                                                        const getDetailedInsight = (planet: string, sign: string, house: number, chart: string) => {
                                                            // If currently fetching for this chart, show loading
                                                            if (isFetchingAi && !aiInsights[chart]) {
                                                                return "The stars are reflecting on your unique path... Our AI is currently synthesizing your personal planetary alignment, Nakshatra themes, and house lordships. This will take just a few seconds.";
                                                            }

                                                            // Check if AI insight is available
                                                            if (aiInsights[chart] && aiInsights[chart][planet]) {
                                                                return aiInsights[chart][planet];
                                                            }

                                                            // Final check for loading state if cache is empty but we're about to fetch or retrying
                                                            if (isFetchingAi) {
                                                                return "Refining your personal awareness triggers...";
                                                            }

                                                            const planetQualities: Record<string, string> = {
                                                                'Sun': 'your core identity, vitality, and life purpose',
                                                                'Moon': 'your emotional nature, instincts, and subconscious mind',
                                                                'Mercury': 'your communication style, thinking patterns, and learning approach',
                                                                'Venus': 'your values, relationships, and sense of beauty',
                                                                'Mars': 'your drive, energy, and how you assert yourself',
                                                                'Jupiter': 'your growth, wisdom, and sense of opportunity',
                                                                'Saturn': 'your discipline, responsibilities, and life lessons',
                                                                'Rahu': 'your worldly desires and areas of intense focus',
                                                                'Ketu': 'your past life skills and areas of spiritual detachment'
                                                            };

                                                            const houseThemes: Record<number, string> = {
                                                                1: 'your personality, physical body, and how you approach life',
                                                                2: 'your wealth, family values, and speech',
                                                                3: 'your courage, siblings, and communication skills',
                                                                4: 'your home life, mother, and emotional foundations',
                                                                5: 'your creativity, children, and intelligence',
                                                                6: 'your health, daily routines, and ability to overcome obstacles',
                                                                7: 'your partnerships, marriage, and business relationships',
                                                                8: 'your transformation, inheritance, and hidden matters',
                                                                9: 'your higher learning, spirituality, and fortune',
                                                                10: 'your career, public reputation, and achievements',
                                                                11: 'your gains, friendships, and long-term goals',
                                                                12: 'your spirituality, losses, and liberation'
                                                            };

                                                            const planetQuality = planetQualities[planet] || 'this area of life';
                                                            const houseTheme = houseThemes[house] || 'this life area';

                                                            return `This placement reveals important information about how ${planetQuality} manifests in your life. When ${planet} is positioned in ${sign}, it takes on the qualities of this zodiac sign - shaping how this planetary energy expresses itself. ${sign} influences the way ${planet} operates, coloring your experiences in the ${house}${getOrdinal(house)} house, which governs ${houseTheme}. This combination creates a unique expression where the natural significations of ${planet} blend with the characteristics of ${sign}, directly impacting how you experience and navigate matters related to the ${house}${getOrdinal(house)} house. In the context of the ${chart} chart, this placement provides deeper insight into ${chart === 'D9' ? 'your marriage, partnerships, and inner spiritual strength' : chart === 'D10' ? 'your professional path, career achievements, and public standing' : chart === 'D1' ? 'your fundamental life experiences and overall personality' : 'this specific dimension of your life'}. Understanding this placement helps you recognize patterns, leverage strengths, and navigate challenges with greater self-awareness and clarity.`;
                                                        };

                                                        return (
                                                            <div key={pName} className={styles.insightCard}>
                                                                <h5 className={styles.insightHeader}>
                                                                    <span className={styles.insightTitle}>{pName} in {signName}</span>
                                                                    <span className={styles.insightSeparator}> - </span>
                                                                    <span className={styles.insightSubtitle}>
                                                                        {house}{getOrdinal(house)} House
                                                                    </span>
                                                                </h5>
                                                                <div className={styles.insightContent}>
                                                                    {complexity === 'TECHNICAL' && (
                                                                        <>
                                                                            <p>
                                                                                <strong>Placement:</strong> {pName} is placed at <strong>{formatDegree(pData.longitude)}</strong> in <strong>{getNakshatra(pData.longitude).name}</strong> Nakshatra in the <strong>{house}{getOrdinal(house)} House</strong> of <strong>{signName}</strong>.
                                                                            </p>
                                                                            <p>
                                                                                <strong>Associations:</strong> {conjunctText} {aspectText}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                    <p>
                                                                        <strong>Awareness Insight:</strong> <span className="italic">{getDetailedInsight(pName, signName, house, activeChart!)}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <DisclaimerNote />
        </div>
    );
}

