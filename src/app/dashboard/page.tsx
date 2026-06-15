'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { CreditCard, UserCircle, ChevronRight, MessageSquare, Trash2, Crown, Download, FileText, PlusCircle, Zap, Sparkles, MapPin, Clock, Trash, CheckSquare, Square, Info } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useProfile } from '@/context/ProfileContext';
import { buildPricingUrl } from '@/lib/monetization';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';

interface UserProfile {
    id: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeOfBirth: string;
    isActive: boolean;
    disabledAt: string | null;
    disabledReason: string | null;
    createdAt: string;
    updatedAt: string;
}

interface UserQuestion {
    id: string;
    questionText: string;
    createdAt: string;
}

interface UserExport {
    id: string;
    chartType: string;
    createdAt: string;
    url: string;
}

interface CreditHistoryItem {
    id: string;
    description: string;
    amount: number;
    createdAt: string;
}

type CreditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface UserCreditRequest {
    id: string;
    requestedCredits: number;
    reason: string | null;
    status: CreditRequestStatus;
    adminNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

interface CreditRequestEligibility {
    welcomeBonusConsumed: boolean;
    remainingWelcomeCredits: number;
    hasPendingRequest: boolean;
    canRequest: boolean;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [stats, setStats] = useState({
        credits: 0,
        profilesCount: 0,
        questionsCount: 0
    });
    const [recentProfiles, setRecentProfiles] = useState<UserProfile[]>([]);
    const [recentQuestions, setRecentQuestions] = useState<UserQuestion[]>([]);
    const [recentExports, setRecentExports] = useState<UserExport[]>([]);
    const [recentCredits, setRecentCredits] = useState<CreditHistoryItem[]>([]);
    const [profileStats, setProfileStats] = useState({ active: 0, limit: 5, extra: 0 });
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeSection, setActiveSection] = useState<'overview' | 'profiles' | 'history' | 'exports' | 'credits'>('overview');
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [selectedExports, setSelectedExports] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isExportDeleting, setIsExportDeleting] = useState(false);
    const [creditRequests, setCreditRequests] = useState<UserCreditRequest[]>([]);
    const [creditRequestEligibility, setCreditRequestEligibility] = useState<CreditRequestEligibility>({
        welcomeBonusConsumed: false,
        remainingWelcomeCredits: 10,
        hasPendingRequest: false,
        canRequest: false
    });
    const [requestedCredits, setRequestedCredits] = useState(10);
    const [creditRequestReason, setCreditRequestReason] = useState('');
    const [submittingCreditRequest, setSubmittingCreditRequest] = useState(false);
    const [welcomeBonusNotice, setWelcomeBonusNotice] = useState<string | null>(null);
    const [hasCheckedWelcomeBonusNotice, setHasCheckedWelcomeBonusNotice] = useState(false);
    const welcomeBonusRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { openNewProfileModal } = useProfile();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/profile');
        }

        if (status === 'authenticated') {
            fetchProfileData();
        }
    }, [status, router]);

    const fetchWelcomeBonusNotice = useCallback(async (attempt = 0) => {
        try {
            const res = await fetch('/api/credits/welcome-bonus-notice', {
                method: 'GET'
            });

            if (res.ok) {
                const data = await res.json();
                if (data?.show && typeof data.message === 'string') {
                    setWelcomeBonusNotice(data.message);
                    setHasCheckedWelcomeBonusNotice(true);
                    return;
                }
            } else {
                const errorPayload = await res.json().catch(() => null);
                if (errorPayload?.error) {
                    console.warn('Welcome bonus notice unavailable:', errorPayload.error);
                }
            }
        } catch (error) {
            console.error('Welcome bonus notice fetch error:', error);
        }

        if (attempt < 3) {
            welcomeBonusRetryTimerRef.current = setTimeout(() => {
                void fetchWelcomeBonusNotice(attempt + 1);
            }, 1200);
            return;
        }

        setHasCheckedWelcomeBonusNotice(true);
    }, []);

    useEffect(() => {
        if (status === 'authenticated' && !hasCheckedWelcomeBonusNotice) {
            void fetchWelcomeBonusNotice();
        }
    }, [status, hasCheckedWelcomeBonusNotice, fetchWelcomeBonusNotice]);

    useEffect(() => {
        return () => {
            if (welcomeBonusRetryTimerRef.current) {
                clearTimeout(welcomeBonusRetryTimerRef.current);
            }
        };
    }, []);

    const acknowledgeWelcomeBonusNotice = () => {
        if (!welcomeBonusNotice) return;

        setWelcomeBonusNotice(null);

        fetch('/api/credits/welcome-bonus-notice', { method: 'POST' }).catch((error) => {
            console.error('Welcome bonus notice acknowledge error:', error);
        });
    };

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            // In a real app, these would be separate or combined API calls
            const [creditsRes, profilesRes, questionsRes, exportsRes, creditHistoryRes, activeProfileRes, creditRequestsRes] = await Promise.all([
                fetch('/api/credits/check'),
                fetch('/api/profiles'),
                fetch('/api/questions'),
                fetch('/api/user/exports'),
                fetch('/api/credits/history'),
                fetch('/api/profiles/active'), // Fetch active profile & limit metadata
                fetch('/api/credits/requests')
            ]);

            const creditsData = await creditsRes.json();
            const profilesData = await profilesRes.ok ? await profilesRes.json() : [];
            const questionsData = await questionsRes.ok ? await questionsRes.json() : [];
            const exportsData = await exportsRes.ok ? await exportsRes.json() : [];
            const creditHistoryData = await creditHistoryRes.ok ? await creditHistoryRes.json() : [];
            const activeData = await activeProfileRes.ok ? await activeProfileRes.json() : {};
            const creditRequestsData = await creditRequestsRes.ok ? await creditRequestsRes.json() : null;

            setStats({
                credits: creditsData.totalCredits || 0,
                profilesCount: Array.isArray(profilesData) ? profilesData.length : 0,
                questionsCount: Array.isArray(questionsData) ? questionsData.length : 0
            });

            setProfileStats({
                active: activeData.profiles?.length || 0,
                limit: activeData.limit || 5,
                extra: activeData.extraSlots || 0
            });



            setRecentProfiles(Array.isArray(profilesData) ? profilesData.slice(0, 100) : []); // Increased slice for dashboard
            setRecentQuestions(Array.isArray(questionsData) ? questionsData.slice(0, 5) : []);
            setRecentExports(Array.isArray(exportsData) ? exportsData : []);
            setRecentCredits(Array.isArray(creditHistoryData) ? creditHistoryData : []);
            setCreditRequests(Array.isArray(creditRequestsData?.requests) ? creditRequestsData.requests : []);

            if (creditRequestsData?.eligibility) {
                setCreditRequestEligibility(creditRequestsData.eligibility);
            } else {
                setCreditRequestEligibility({
                    welcomeBonusConsumed: false,
                    remainingWelcomeCredits: 10,
                    hasPendingRequest: false,
                    canRequest: false
                });
            }

        } catch (error) {
            console.error('Failed to fetch profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (profileId: string) => {
        setProfileToDelete(profileId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!profileToDelete) return;

        try {
            setIsDeleting(true);
            const res = await fetch(`/api/profiles/${profileToDelete}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Refresh data
                await fetchProfileData();
                setShowDeleteConfirm(false);
                setProfileToDelete(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete profile');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred while deleting the profile');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedProfiles.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedProfiles.length} profiles? This action cannot be undone.`)) return;

        try {
            setIsBulkDeleting(true);
            const res = await fetch('/api/profiles/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedProfiles }),
            });

            if (res.ok) {
                await fetchProfileData();
                setSelectedProfiles([]);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete profiles');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkDeleteExports = async () => {
        if (selectedExports.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedExports.length} export records?`)) return;

        try {
            setIsExportDeleting(true);
            const res = await fetch('/api/user/exports/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedExports }),
            });

            if (res.ok) {
                await fetchProfileData();
                setSelectedExports([]);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete export records');
            }
        } catch (error) {
            console.error('Bulk delete exports error:', error);
        } finally {
            setIsExportDeleting(false);
        }
    };

    const toggleProfileSelection = (id: string, e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setSelectedProfiles(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleExportSelection = (id: string, e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setSelectedExports(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const selectAllProfiles = () => {
        if (selectedProfiles.length === recentProfiles.length) {
            setSelectedProfiles([]);
        } else {
            setSelectedProfiles(recentProfiles.map(p => p.id));
        }
    };

    const selectAllExports = () => {
        if (selectedExports.length === recentExports.length) {
            setSelectedExports([]);
        } else {
            setSelectedExports(recentExports.map(e => e.id));
        }
    };

    const handleDeleteExport = async (id: string) => {
        if (!confirm('Are you sure you want to delete this export record?')) return;

        try {
            const res = await fetch(`/api/user/exports/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchProfileData();
            } else {
                alert('Failed to delete export record');
            }
        } catch (error) {
            console.error('Delete export error:', error);
        }
    };

    const handleDeleteAllExports = async () => {
        if (recentExports.length === 0) return;
        if (!confirm('Are you sure you want to delete ALL chart export history? This action cannot be undone.')) return;

        try {
            const res = await fetch('/api/user/exports', { method: 'DELETE' });
            if (res.ok) {
                await fetchProfileData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete all exports');
            }
        } catch (error) {
            console.error('Bulk delete exports error:', error);
        }
    };

    const handleDownloadPDF = async (exp: UserExport) => {
        // Redirection logic to trigger download
        if (exp.url.startsWith('/api/charts/export')) {
            // It's a proper link
            window.open(exp.url, '_blank');
        } else {
            // Old record or placeholder
            alert('This report uses an older format and cannot be directly re-downloaded. Please generate a new one from the chart page.');
        }
    };

    const handleSubmitCreditRequest = async () => {
        if (!creditRequestEligibility.canRequest) return;

        const creditsToRequest = Number(requestedCredits);
        if (!Number.isInteger(creditsToRequest) || creditsToRequest < 1) {
            alert('Please enter a valid credit amount.');
            return;
        }

        try {
            setSubmittingCreditRequest(true);
            const res = await fetch('/api/credits/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestedCredits: creditsToRequest,
                    reason: creditRequestReason
                })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to submit credit request.');
                if (res.status === 403 || res.status === 409) {
                    await fetchProfileData();
                }
                return;
            }

            setCreditRequestReason('');
            alert(data.message || 'Credit request submitted.');
            await fetchProfileData();
        } catch (error) {
            console.error('Credit request submit error:', error);
            alert('An error occurred while submitting your request.');
        } finally {
            setSubmittingCreditRequest(false);
        }
    };

    if (status === 'loading' || (status === 'authenticated' && loading)) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
                <p>Aligning with your dashboard...</p>
            </div>
        );
    }

    if (!session) return null;

    const hasPurchaseSuccess = searchParams.get('purchase') === 'success';
    const purchaseIntent = searchParams.get('purchaseIntent');
    const isLowCredit = stats.credits > 0 && stats.credits <= 2;
    const isOutOfCredits = stats.credits === 0;
    const dashboardTopUpUrl = buildPricingUrl({
        intent: 'top_up',
        source: 'dashboard_credits',
        returnTo: '/dashboard',
    });
    const dashboardLowCreditUrl = buildPricingUrl({
        intent: 'top_up',
        source: isOutOfCredits ? 'dashboard_out_of_credits' : 'dashboard_low_credit',
        returnTo: '/dashboard',
    });

    return (
        <div className={styles.profileContainer}>
            <header className={styles.header}>
                <span className="cosmic-label mb-2 block">Dharma Dashboard</span>
                <h1 className="mystic-text text-4xl mb-4">Your Cosmic Center</h1>
                <div className="sacred-divider ml-0 justify-start mb-8"></div>
                <div className={styles.userBasicInfo}>
                    <div className={styles.avatar}>
                        {session.user?.image ? (
                            <Image src={session.user.image} alt={session.user.name || 'User'} width={80} height={80} className={styles.avatarImage} />
                        ) : (
                            <UserCircle size={80} />
                        )}
                    </div>
                    <div>
                        <h1 className={styles.userName}>{session.user?.name}</h1>
                        <p className={styles.userEmail}>{session.user?.email}</p>
                    </div>
                </div>
                <div className={`${styles.statsBar} sacred-card`}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Credits</span>
                        <span className="text-[var(--accent-gold)] font-bold text-xl">{stats.credits}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Profiles</span>
                        <span className="text-[var(--accent-gold)] font-bold text-xl">{stats.profilesCount}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Questions</span>
                        <span className="text-[var(--accent-gold)] font-bold text-xl">{stats.questionsCount}</span>
                    </div>
                </div>
            </header>

            {hasPurchaseSuccess && purchaseIntent === 'top_up' && (
                <div className={styles.welcomeBonusNotice}>
                    <div className={styles.welcomeBonusNoticeText}>
                        <Sparkles size={18} />
                        <span>Credits added successfully. You are ready for more clarity sessions, chart unlocks, or a premium report.</span>
                    </div>
                    <div className={styles.noticeActions}>
                        <Link href="/clarity" className={styles.noticeActionBtn}>
                            Use Credits Now
                        </Link>
                    </div>
                </div>
            )}

            {hasPurchaseSuccess && purchaseIntent === 'profile_expansion' && (
                <div className={styles.welcomeBonusNotice}>
                    <div className={styles.welcomeBonusNoticeText}>
                        <Sparkles size={18} />
                        <span>Credits added successfully. Reopen the profile flow to expand your active profile limit.</span>
                    </div>
                    <div className={styles.noticeActions}>
                        <button
                            type="button"
                            className={styles.noticeActionBtn}
                            onClick={() => void openNewProfileModal()}
                        >
                            Continue Adding Profiles
                        </button>
                    </div>
                </div>
            )}

            {PAYMENTS_ENABLED && !hasPurchaseSuccess && (isOutOfCredits || isLowCredit) && (
                <div className={styles.welcomeBonusNotice}>
                    <div className={styles.welcomeBonusNoticeText}>
                        <Info size={18} />
                        <span>
                            {isOutOfCredits
                                ? 'You are out of credits. Top up now so your next question, chart unlock, or report does not stall.'
                                : `You have ${stats.credits} credits left. A small top-up now keeps your next reading or premium unlock moving.`}
                        </span>
                    </div>
                    <div className={styles.noticeActions}>
                        <Link href={dashboardLowCreditUrl} className={styles.noticeActionBtn}>
                            Top Up Credits
                        </Link>
                    </div>
                </div>
            )}

            <div className={styles.layout}>
                {/* Sidebar Navigation */}
                <aside className={styles.sidebar}>
                    <nav className={styles.nav}>
                        <button
                            className={`${styles.navItem} ${activeSection === 'overview' ? styles.activeNav : ''}`}
                            onClick={() => setActiveSection('overview')}
                        >
                            <Crown size={18} /> Overview
                        </button>
                        <button
                            className={`${styles.navItem} ${activeSection === 'profiles' ? styles.activeNav : ''}`}
                            onClick={() => setActiveSection('profiles')}
                        >
                            <UserCircle size={18} /> Profiles
                        </button>
                        <button
                            className={`${styles.navItem} ${activeSection === 'credits' ? styles.activeNav : ''}`}
                            onClick={() => setActiveSection('credits')}
                        >
                            <CreditCard size={18} /> Credits
                        </button>
                        <button
                            className={`${styles.navItem} ${activeSection === 'history' ? styles.activeNav : ''}`}
                            onClick={() => setActiveSection('history')}
                        >
                            <MessageSquare size={18} /> Questions
                        </button>
                        <button
                            className={`${styles.navItem} ${activeSection === 'exports' ? styles.activeNav : ''}`}
                            onClick={() => setActiveSection('exports')}
                        >
                            <Download size={18} /> Chart Exports
                        </button>
                    </nav>
                </aside>

                <main className={styles.mainContent}>
                    {/* Overview Section */}
                    {activeSection === 'overview' && (
                        <div className={styles.overviewGrid}>
                            <section className={`${styles.heroSection} sacred-card`}>
                                <h2 className="mystic-text text-2xl">Welcome back, {session.user?.name?.split(' ')[0] || 'Friend'}</h2>
                                <p className="text-white/70 italic my-2">The stars have moved since your last visit.</p>
                                {PAYMENTS_ENABLED && (isOutOfCredits || isLowCredit) && (
                                    <div className={styles.infoNote}>
                                        <Info size={14} />
                                        <span>
                                            {isOutOfCredits
                                                ? 'You are currently out of credits. Top up before starting your next session.'
                                                : `${stats.credits} credits remaining. Top up now if you want room for follow-up questions and unlocks.`}
                                        </span>
                                    </div>
                                )}
                                <div className={styles.heroActions}>
                                    <Link href="/clarity" className="primary-btn-cosmic text-sm">
                                        <Sparkles size={16} /> Ask AI Astrologer
                                    </Link>
                                    {PAYMENTS_ENABLED && (
                                        <Link href={dashboardTopUpUrl} className="secondary-btn-cosmic text-sm">
                                            <CreditCard size={16} /> Top Up Credits
                                        </Link>
                                    )}
                                    <button onClick={openNewProfileModal} className="secondary-btn-cosmic text-sm">
                                        <PlusCircle size={16} /> New Profile
                                    </button>
                                </div>
                            </section>

                            <div className={styles.quickStats}>
                                <div className={styles.quickStatCard}>
                                    <h3>Profile Usage</h3>
                                    <div className={styles.usageContainer}>
                                        <div className={styles.usageHeader}>
                                            <span className={styles.usageLabel}>Active Slots</span>
                                            <span className={styles.usageValue}>{profileStats.active} / {profileStats.limit}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${Math.min((profileStats.active / profileStats.limit) * 100, 100)}%` }}
                                            />
                                        </div>
                                        {profileStats.extra > 0 && (
                                            <p className={styles.usageNote}>
                                                Includes {profileStats.extra} purchased active slot{profileStats.extra > 1 ? 's' : ''}.
                                            </p>
                                        )}
                                        <Link href="/chart" className={styles.cardFooterLink}>
                                            Manage Profiles <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                                <div className={styles.quickStatCard}>
                                    <h3>Recent Questions</h3>
                                    <div className={styles.miniList}>
                                        {recentQuestions.slice(0, 3).map(q => (
                                            <Link href={`/clarity/history/${q.id}`} key={q.id} className={styles.miniRow}>
                                                <span className={styles.miniText}>{q.questionText}</span>
                                                <ChevronRight size={14} />
                                            </Link>
                                        ))}
                                    </div>
                                    <button onClick={() => setActiveSection('history')} className={styles.cardFooterLink}>
                                        View All History <ChevronRight size={14} />
                                    </button>
                                </div>
                                <div className={styles.quickStatCard}>
                                    <h3>Community</h3>
                                    <div className={styles.communityCTA}>
                                        <div className={styles.communityIcon}>
                                            <MessageSquare size={24} />
                                        </div>
                                        <div>
                                            <p className={styles.communityText}>Connect with others, share reflections, and find collective awareness.</p>
                                            <Link href="/community" className={styles.cardFooterLink}>
                                                Explore Forum <ChevronRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Profiles Section */}
                    {activeSection === 'profiles' && (
                        <section className={styles.fullSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}><UserCircle size={20} /> My Birth Profiles</h2>
                                <div className={styles.headerActions}>
                                    {selectedProfiles.length > 0 && (
                                        <button
                                            className={styles.bulkDeleteBtn}
                                            onClick={handleBulkDelete}
                                            disabled={isBulkDeleting}
                                        >
                                            <Trash2 size={16} /> Delete Selected ({selectedProfiles.length})
                                        </button>
                                    )}
                                    <button onClick={openNewProfileModal} className={styles.actionBtn}>New Profile</button>
                                </div>
                            </div>

                            {/* Life Report Action Card */}
                            {recentProfiles.find(p => p.isActive) && (
                                <div className={styles.lifeReportCard}>
                                    <div className={styles.lifeReportContent}>
                                        <div className={styles.lifeReportBadge}><Crown size={14} /> Premium Life Feature</div>
                                        <h3>Your Grand Life Report</h3>
                                        <p>Get a comprehensive 40-page analysis of your destiny, health, and soul purpose based on {recentProfiles.find(p => p.isActive)?.name}&apos;s chart.</p>
                                        <Link href={`/report/${recentProfiles.find(p => p.isActive)?.id}`} className={styles.reportBtn}>
                                            Access Life Report <PlusCircle size={16} />
                                        </Link>
                                    </div>
                                    <div className={styles.lifeReportIcon}>
                                        <Crown size={80} />
                                    </div>
                                </div>
                            )}

                            <div className={styles.profileControls}>
                                <button className={styles.textLink} onClick={selectAllProfiles}>
                                    {selectedProfiles.length === recentProfiles.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className={styles.profileCount}>{recentProfiles.length} Profiles Saved</span>
                            </div>

                            <div className={styles.profileGrid}>
                                {recentProfiles.length > 0 ? (
                                    recentProfiles.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className={`${styles.profileCard} ${!profile.isActive ? styles.disabledCard : ''} ${selectedProfiles.includes(profile.id) ? styles.selectedCard : ''}`}
                                            onClick={() => router.push(`/chart?profileId=${profile.id}`)}
                                        >
                                            <div className={styles.cardHeader}>
                                                <button
                                                    className={styles.checkbox}
                                                    onClick={(e) => toggleProfileSelection(profile.id, e)}
                                                >
                                                    {selectedProfiles.includes(profile.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>
                                                {profile.isActive ? (
                                                    <span className={styles.activeBadge}>Active</span>
                                                ) : (
                                                    <span className={styles.disabledBadge}>Disabled</span>
                                                )}
                                            </div>

                                            <div className={styles.cardBody}>
                                                <h3 className={styles.profileName}>{profile.name}</h3>
                                                <div className={styles.detailList}>
                                                    <div className={styles.detailItem}>
                                                        <Clock size={14} />
                                                        <span>
                                                            {new Date(profile.dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            <span className={styles.timeLabel}> at {profile.timeOfBirth}</span>
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <MapPin size={14} />
                                                        <span>{profile.placeOfBirth}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.cardActions}>
                                                <Link href={`/chart?profileId=${profile.id}`} className={styles.viewLink} onClick={(e) => e.stopPropagation()}>
                                                    View Chart <ChevronRight size={16} />
                                                </Link>
                                                <button
                                                    className={styles.iconDeleteBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(profile.id);
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        <p>No saved profiles yet.</p>
                                        <Link href="/chart" className={styles.textLink}>Create your birth chart</Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Credits Section */}
                    {activeSection === 'credits' && (
                        <section className={styles.fullSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}><CreditCard size={20} /> Clarity Credits</h2>
                                {PAYMENTS_ENABLED ? (
                                    <Link href={dashboardTopUpUrl} className={styles.actionBtn}>Add Credits</Link>
                                ) : (
                                    <span className={styles.infoBadge}>Purchases Paused</span>
                                )}
                            </div>
                            {!PAYMENTS_ENABLED && (
                                <div className={styles.infoNote}>
                                    <Info size={14} />
                                    <span>{PAYMENTS_PAUSED_MESSAGE}</span>
                                </div>
                            )}
                            {PAYMENTS_ENABLED && (isOutOfCredits || isLowCredit) && (
                                <div className={styles.infoNote}>
                                    <Info size={14} />
                                    <span>
                                        {isOutOfCredits
                                            ? 'You have no credits available. Top up once and come right back to continue with clarity, reports, or premium chart unlocks.'
                                            : `You have ${stats.credits} credits left. A mid-sized pack usually gives enough space for follow-up readings and premium features.`}
                                    </span>
                                </div>
                            )}
                            <div className={styles.creditsDisplay}>
                                <div className={styles.creditValueLarge}>
                                    <Zap size={32} />
                                    <span>{stats.credits}</span>
                                    <label>Available Credits</label>
                                </div>

                                <div className={styles.creditRequestPanel}>
                                    <div className={styles.creditRequestHeader}>
                                        <h3>Need Additional Credits?</h3>
                                        {creditRequestEligibility.hasPendingRequest && (
                                            <span className={styles.statusPending}>Pending Request</span>
                                        )}
                                    </div>

                                    {creditRequestEligibility.canRequest ? (
                                        <div className={styles.creditRequestForm}>
                                            <div className={styles.creditRequestField}>
                                                <label htmlFor="requestedCredits">Credits Needed</label>
                                                <input
                                                    id="requestedCredits"
                                                    type="number"
                                                    min={1}
                                                    max={1000}
                                                    value={requestedCredits}
                                                    onChange={(e) => {
                                                        const parsed = parseInt(e.target.value, 10);
                                                        setRequestedCredits(Number.isNaN(parsed) ? 0 : parsed);
                                                    }}
                                                    className={styles.creditRequestInput}
                                                />
                                            </div>
                                            <div className={styles.creditRequestField}>
                                                <label htmlFor="creditRequestReason">Reason (optional)</label>
                                                <textarea
                                                    id="creditRequestReason"
                                                    value={creditRequestReason}
                                                    onChange={(e) => setCreditRequestReason(e.target.value)}
                                                    className={styles.creditRequestTextarea}
                                                    rows={3}
                                                    maxLength={1000}
                                                    placeholder="Tell us why you need additional credits."
                                                />
                                            </div>
                                            <button
                                                className={styles.creditRequestBtn}
                                                onClick={handleSubmitCreditRequest}
                                                disabled={submittingCreditRequest}
                                            >
                                                {submittingCreditRequest ? 'Submitting...' : 'Request Credits'}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className={styles.creditRequestHint}>
                                            {creditRequestEligibility.hasPendingRequest
                                                ? 'You already have a pending request. Please wait for admin review.'
                                                : creditRequestEligibility.welcomeBonusConsumed
                                                    ? 'Credit requests are currently unavailable.'
                                                    : `Use your welcome bonus first. Remaining welcome credits: ${creditRequestEligibility.remainingWelcomeCredits}.`}
                                        </p>
                                    )}
                                </div>

                                {creditRequests.length > 0 && (
                                    <div className={styles.creditRequestHistory}>
                                        <h3 className={styles.creditRequestHistoryTitle}>Credit Request History</h3>
                                        <div className={styles.tableWrapper}>
                                            <table className={styles.exportTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Credits</th>
                                                        <th>Status</th>
                                                        <th>Requested</th>
                                                        <th>Admin Note</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {creditRequests.map((request) => (
                                                        <tr key={request.id}>
                                                            <td>{request.requestedCredits}</td>
                                                            <td>
                                                                <span className={
                                                                    request.status === 'APPROVED'
                                                                        ? styles.statusApproved
                                                                        : request.status === 'REJECTED'
                                                                            ? styles.statusRejected
                                                                            : styles.statusPending
                                                                }>
                                                                    {request.status}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {new Date(request.createdAt).toLocaleDateString()}
                                                            </td>
                                                            <td>{request.adminNote || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.tableWrapper}>
                                    {recentCredits.length > 0 ? (
                                        <table className={styles.exportTable}>
                                            <thead>
                                                <tr>
                                                    <th>Description</th>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentCredits.map((tx) => (
                                                    <tr key={tx.id}>
                                                        <td>
                                                            <div className={styles.exportTypeCell}>
                                                                <div className={`${styles.statusIcon} ${tx.amount > 0 ? styles.statusPositive : styles.statusNegative}`}>
                                                                    {tx.amount > 0 ? <PlusCircle size={16} /> : <Zap size={16} />}
                                                                </div>
                                                                <span>{tx.description}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={styles.dateCell}>
                                                                {new Date(tx.createdAt).toLocaleDateString()}
                                                                <small>{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={tx.amount > 0 ? styles.amountPositive : styles.amountNegative}>
                                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className={styles.emptyState}>
                                            <p>No credit history yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* History Section */}
                    {activeSection === 'history' && (
                        <section className={styles.fullSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}><MessageSquare size={20} /> Question History</h2>
                            </div>
                            <div className={styles.list}>
                                {recentQuestions.length > 0 ? (
                                    recentQuestions.map((q) => (
                                        <div key={q.id} className={styles.historyItem}>
                                            <div className={styles.historyIcon}>
                                                <MessageSquare size={18} />
                                            </div>
                                            <div className={styles.historyContent}>
                                                <p className={styles.historyQuestion}>{q.questionText}</p>
                                                <p className={styles.historyDate}>{new Date(q.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <Link href={`/clarity/history/${q.id}`} className={styles.viewResultBtn}>
                                                View Solution
                                            </Link>
                                        </div>
                                    ))
                                ) : <div className={styles.emptyState}><p>No questions asked yet.</p></div>}
                            </div>
                        </section>
                    )}

                    {/* Exports Section */}
                    {activeSection === 'exports' && (
                        <section className={styles.fullSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}><Download size={20} /> Chart Exports History</h2>
                                <div className={styles.headerActions}>
                                    {selectedExports.length > 0 && (
                                        <button
                                            className={styles.bulkDeleteBtn}
                                            onClick={handleBulkDeleteExports}
                                            disabled={isExportDeleting}
                                        >
                                            <Trash2 size={16} /> Delete Selected ({selectedExports.length})
                                        </button>
                                    )}
                                    <button
                                        className={styles.actionBtnSecondary}
                                        onClick={handleDeleteAllExports}
                                    >
                                        <Trash size={16} /> Delete All
                                    </button>
                                </div>
                            </div>
                            <div className={styles.tableWrapper}>
                                {recentExports.length > 0 ? (
                                    <table className={styles.exportTable}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <button
                                                        className={styles.checkbox}
                                                        onClick={selectAllExports}
                                                        title={selectedExports.length === recentExports.length ? "Deselect All" : "Select All"}
                                                    >
                                                        {selectedExports.length === recentExports.length && recentExports.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                </th>
                                                <th>Report Type</th>
                                                <th>Export Date & Time</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentExports.map((exp) => (
                                                <tr
                                                    key={exp.id}
                                                    className={selectedExports.includes(exp.id) ? styles.selectedRow : ''}
                                                    onClick={(e) => toggleExportSelection(exp.id, e)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className={styles.checkbox}
                                                            onClick={(e) => toggleExportSelection(exp.id, e)}
                                                        >
                                                            {selectedExports.includes(exp.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <div className={styles.exportTypeCell}>
                                                            <FileText size={16} />
                                                            <span>{exp.chartType} Analysis</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={styles.dateCell}>
                                                            {new Date(exp.createdAt).toLocaleDateString()}
                                                            <small className={styles.timeLabel}> at {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                        </span>
                                                    </td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <div className={styles.actionCell}>
                                                            <button className={styles.miniDownloadBtn} onClick={() => handleDownloadPDF(exp)}>
                                                                Download PDF
                                                            </button>
                                                            <button className={styles.miniTrashBtn} onClick={() => handleDeleteExport(exp.id)} title="Delete entry">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <p>No exported files.</p>
                                    </div>
                                )}
                            </div>
                            <div className={styles.infoNote}>
                                <Info size={14} />
                                <span>Export records are kept for the duration of your session. Re-downloading re-generates the report with current planetary data.</span>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Profile?"
                message="Are you sure you want to delete this profile? This action is permanent and cannot be undone."
                confirmText={isDeleting ? "Deleting..." : "Yes, Delete"}
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={() => !isDeleting && setShowDeleteConfirm(false)}
                variant="danger"
            />

            <ConfirmDialog
                isOpen={Boolean(welcomeBonusNotice)}
                title="Welcome Bonus Added"
                message={welcomeBonusNotice || ''}
                confirmText="Got It"
                cancelText="Close"
                onConfirm={acknowledgeWelcomeBonusNotice}
                onCancel={acknowledgeWelcomeBonusNotice}
                variant="info"
            />
        </div>
    );
}
