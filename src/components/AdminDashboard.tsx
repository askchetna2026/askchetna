
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './AdminDashboard.module.css';

interface PricingPlan {
    id: string;
    key: string;
    name: string;
    description: string;
    price: number;
    credits: number;
}

interface ServiceCost {
    key: string;
    credits: number;
    description: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    city: string;
    createdAt: string;
    isSubscribed: boolean;
    credits: number;
}

interface AnalyticsData {
    totalUsers: number;
    totalQuestions: number;
    totalRevenue: number;
    activeProfiles: number;
    dailyViews: number;
    totalViews: number;
    periodDays: number;
    topCountries: Array<{ country: string; _count: { country: number } }>;
    funnel: Array<{ key: string; label: string; count: number }>;
    topPages: Array<{ path: string; views: number }>;
}

interface BlogPost {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}

type CreditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CreditRequest {
    id: string;
    requestedCredits: number;
    reason: string | null;
    status: CreditRequestStatus;
    adminNote: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface LifecycleSummaryItem {
    campaignKey: string;
    status: string;
    _count: {
        _all: number;
    };
}

interface LifecycleRecentItem {
    id: string;
    campaignKey: string;
    status: string;
    subject: string;
    sentAt: string | null;
    createdAt: string;
    user: {
        email: string | null;
        name: string | null;
    };
}

interface LifecyclePerformanceItem {
    campaignKey: string;
    sent: number;
    uniqueRecipients: number;
    reengagedUsers: number;
    checkoutUsers: number;
    paymentUsers: number;
    clarityUsers: number;
    chartUnlockUsers: number;
    reportUnlockUsers: number;
    reportStartUsers: number;
    profileExpansionUsers: number;
    revenue: number;
    paymentConversionRate: number;
}

interface LifecycleRunItem {
    id: string;
    batchKey: string;
    campaignKey: string;
    triggerType: string;
    status: string;
    attempted: number;
    sent: number;
    skipped: number;
    failed: number;
    createdAt: string;
}

interface LifecycleAutomationStatus {
    mode: string;
    description: string;
    triggerSource: string;
    abandonedTopUpWindowHours: number;
    clarityReengagementWindowHours: number;
    defaultTrafficLimit: number;
    lastTrafficRunAt: string | null;
}

interface LifecycleData {
    summary: LifecycleSummaryItem[];
    recent: LifecycleRecentItem[];
    performance: LifecyclePerformanceItem[];
    recentRuns: LifecycleRunItem[];
    lookbackDays: number;
    conversionWindowDays: number;
    automation: LifecycleAutomationStatus;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'analytics' | 'pricing' | 'users' | 'newsletter' | 'blogs' | 'creditRequests' | 'lifecycle'>('analytics');
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [services, setServices] = useState<ServiceCost[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
    const [lifecycleData, setLifecycleData] = useState<LifecycleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // User Filters State
    const [userFilters, setUserFilters] = useState({
        subscribed: 'all',
        city: '',
        minCredits: 0
    });
    const [creditRequestFilter, setCreditRequestFilter] = useState<'ALL' | CreditRequestStatus>('PENDING');

    // Newsletter State
    const [newsletterSubject, setNewsletterSubject] = useState('');
    const [newsletterContent, setNewsletterContent] = useState('');
    const [sendingNewsletter, setSendingNewsletter] = useState(false);
    const [runningLifecycle, setRunningLifecycle] = useState<string | null>(null);
    const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Build query params for users
            const userParams = new URLSearchParams({
                limit: '100',
                subscribed: userFilters.subscribed,
                city: userFilters.city,
                minCredits: userFilters.minCredits.toString()
            });
            const creditRequestParams = new URLSearchParams();
            if (creditRequestFilter !== 'ALL') {
                creditRequestParams.set('status', creditRequestFilter);
            }

            const [analyticsRes, pricingRes, servicesRes, usersRes, blogsRes, creditRequestsRes, lifecycleRes] = await Promise.all([
                fetch('/api/admin/analytics'),
                fetch('/api/admin/pricing'),
                fetch('/api/admin/services'),
                fetch(`/api/admin/users?${userParams.toString()}`),
                fetch('/api/blogs'),
                fetch(`/api/admin/credit-requests?${creditRequestParams.toString()}`),
                fetch('/api/admin/lifecycle')
            ]);

            if (analyticsRes.status === 401) {
                router.push('/login');
                return;
            }

            if (!analyticsRes.ok || !pricingRes.ok || !servicesRes.ok || !usersRes.ok || !blogsRes.ok || !creditRequestsRes.ok || !lifecycleRes.ok) {
                throw new Error('Some data failed to load');
            }

            const aData = await analyticsRes.json();
            const pData = await pricingRes.json();
            const sData = await servicesRes.json();
            const uData = await usersRes.json();
            const bData = await blogsRes.json();
            const cData = await creditRequestsRes.json();
            const lData = await lifecycleRes.json();

            setAnalytics(aData);
            setPlans(pData);
            setServices(sData);
            setUsers(uData?.users || []);
            setBlogs(bData);
            setCreditRequests(cData?.requests || []);
            setLifecycleData(lData);
        } catch (error: unknown) {
            console.error('Failed to load admin data', error);
            setError(error instanceof Error ? error.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [router, userFilters, creditRequestFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]); // Re-fetch when filters change

    const handleUpdatePrice = async (key: string, newPrice: number) => {
        if (!confirm(`Update price for ${key} to ₹${newPrice}?`)) return;
        try {
            const res = await fetch('/api/admin/pricing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, price: newPrice * 100 })
            });
            if (res.ok) {
                alert('Price updated!');
                fetchData();
            } else {
                alert('Failed to update price');
            }
        } catch {
            alert('Error updating price');
        }
    };

    const handleUpdateServiceCost = async (key: string, newCredits: number) => {
        if (!confirm(`Update cost for ${key} to ${newCredits} credits?`)) return;
        try {
            const res = await fetch('/api/admin/services', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, credits: newCredits })
            });
            if (res.ok) {
                alert('Service cost updated!');
                fetchData();
            } else {
                alert('Failed to update service cost');
            }
        } catch {
            alert('Error updating service cost');
        }
    };

    const handleSendNewsletter = async () => {
        if (!confirm('Are you sure you want to send this email to ALL subscribed users?')) return;

        setSendingNewsletter(true);
        try {
            const res = await fetch('/api/admin/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: newsletterSubject, content: newsletterContent })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Newsletter sent to ${data.count} users.`);
                setNewsletterSubject('');
                setNewsletterContent('');
            } else {
                alert('Failed to send newsletter: ' + data.error);
            }
        } catch {
            alert('Error sending newsletter');
        } finally {
            setSendingNewsletter(false);
        }
    };

    const handleReviewCreditRequest = async (id: string, action: 'APPROVE' | 'REJECT') => {
        const adminNote = prompt(
            action === 'APPROVE'
                ? 'Optional note for the user (approval message):'
                : 'Optional reason for rejection:'
        ) || '';

        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this credit request?`)) return;

        try {
            const res = await fetch(`/api/admin/credit-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, adminNote })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to review request');
                return;
            }

            alert(data.message || `Request ${action.toLowerCase()}d.`);
            fetchData();
        } catch (error) {
            console.error('Credit request review error:', error);
            alert('Error reviewing credit request');
        }
    };

    const handleDeleteBlog = async (id: string) => {
        if (!confirm('Are you sure you want to delete this blog post? This action is permanent.')) return;

        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                alert('Blog post deleted');
                fetchData();
            } else {
                const data = await res.json();
                alert('Failed to delete blog: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete blog error:', error);
            alert('Error deleting blog post');
        }
    };

    const handleRunLifecycleCampaign = async (campaign: 'all' | 'abandoned_topup' | 'clarity_reengagement') => {
        setRunningLifecycle(campaign);
        setLifecycleMessage(null);

        try {
            const res = await fetch('/api/admin/lifecycle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaign, limit: 25 })
            });

            const data = await res.json();

            if (!res.ok) {
                setLifecycleMessage(data.error || 'Failed to run lifecycle campaign.');
                return;
            }

            const resultParts: string[] = [];
            if (data.results?.abandonedTopup) {
                const run = data.results.abandonedTopup;
                resultParts.push(`abandoned top-up: ${run.sent} sent, ${run.skipped} skipped, ${run.failed} failed`);
            }
            if (data.results?.clarityReengagement) {
                const run = data.results.clarityReengagement;
                resultParts.push(`clarity re-engagement: ${run.sent} sent, ${run.skipped} skipped, ${run.failed} failed`);
            }

            setLifecycleMessage(resultParts.length > 0 ? `Lifecycle run complete - ${resultParts.join(' | ')}` : 'Lifecycle run complete.');
            void fetchData();
        } catch (runError) {
            console.error('Lifecycle campaign run error:', runError);
            setLifecycleMessage('Failed to run lifecycle campaign.');
        } finally {
            setRunningLifecycle(null);
        }
    };

    const formatLifecycleCampaign = (campaignKey: string) =>
        campaignKey
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

    const getLifecycleStatusClassName = (status: string) => {
        switch (status.toLowerCase()) {
            case 'sent':
                return styles.approvedBadge;
            case 'failed':
                return styles.rejectedBadge;
            default:
                return styles.pendingBadge;
        }
    };

    if (loading) return <div className={styles.loading}>Loading Admin Dashboard...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <h2 className={styles.logo}>AskChetna Admin</h2>
                <nav className={styles.nav}>
                    <button
                        className={`${styles.navItem} ${activeTab === 'analytics' ? styles.active : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        Analytics
                    </button>
                    {/* Links rather than tabs: each is its own page with its own
                        queue and filters, and neither was reachable from here at
                        all — the approval flow needed the URL typed in.

                        Two distinct things: Applications is first-screening
                        review, Astrologers is the approved roster. */}
                    <Link href="/admin/astrologer-applications" className={styles.navItem}>
                        Applications
                    </Link>
                    <Link href="/admin/astrologers" className={styles.navItem}>
                        Astrologers
                    </Link>
                    <button
                        className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'creditRequests' ? styles.active : ''}`}
                        onClick={() => setActiveTab('creditRequests')}
                    >
                        Credit Requests
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'pricing' ? styles.active : ''}`}
                        onClick={() => setActiveTab('pricing')}
                    >
                        Pricing & Services
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'newsletter' ? styles.active : ''}`}
                        onClick={() => setActiveTab('newsletter')}
                    >
                        Newsletter
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'lifecycle' ? styles.active : ''}`}
                        onClick={() => setActiveTab('lifecycle')}
                    >
                        Lifecycle
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'blogs' ? styles.active : ''}`}
                        onClick={() => setActiveTab('blogs')}
                    >
                        Blogs
                    </button>
                </nav>
            </div>

            <main className={styles.content}>
                {activeTab === 'analytics' && analytics && (
                    <div className={styles.analyticsGrid}>
                        <div className={styles.statCard}>
                            <h3>Total Revenue</h3>
                            <p className={styles.statValue}>₹{analytics.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3>Total Users</h3>
                            <p className={styles.statValue}>{analytics.totalUsers}</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3>Daily Views</h3>
                            <p className={styles.statValue}>{analytics.dailyViews}</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3>Total Views</h3>
                            <p className={styles.statValue}>{analytics.totalViews}</p>
                        </div>

                        <div className={styles.section} style={{ gridColumn: '1 / -1' }}>
                            <h3>Top Locations</h3>
                            <div className={styles.geoGrid}>
                                {analytics.topCountries.map((c, i) => (
                                    <div key={i} className={styles.geoItem}>
                                        <span>{c.country || 'Unknown'}</span>
                                        <strong>{c._count.country}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section} style={{ gridColumn: '1 / -1' }}>
                            <h3>Funnel Snapshot ({analytics.periodDays} Days)</h3>
                            <div className={styles.funnelGrid}>
                                {analytics.funnel.map((step) => (
                                    <div key={step.key} className={styles.funnelCard}>
                                        <span className={styles.funnelLabel}>{step.label}</span>
                                        <strong className={styles.funnelValue}>{step.count}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section} style={{ gridColumn: '1 / -1' }}>
                            <h3>Top Pages ({analytics.periodDays} Days)</h3>
                            <div className={styles.topPageList}>
                                {analytics.topPages.length > 0 ? analytics.topPages.map((page) => (
                                    <div key={page.path} className={styles.topPageItem}>
                                        <span className={styles.topPagePath}>{page.path}</span>
                                        <strong>{page.views}</strong>
                                    </div>
                                )) : (
                                    <div className={styles.emptyPanel}>No page-view data yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className={styles.section}>
                        <div className={styles.sectionToolbar}>
                            <h3>User Management</h3>
                            <button className={`${styles.saveBtn} ${styles.compactBtn}`} onClick={fetchData}>Refresh</button>
                        </div>

                        {/* Filters Bar */}
                        <div className={styles.filterBar}>
                            <div className={styles.filterGroup}>
                                <label>Newsletter</label>
                                <select
                                    value={userFilters.subscribed}
                                    onChange={(e) => setUserFilters({ ...userFilters, subscribed: e.target.value })}
                                    className={`${styles.input} ${styles.inputMd}`}
                                >
                                    <option value="all">All Users</option>
                                    <option value="true">Subscribed</option>
                                    <option value="false">Unsubscribed</option>
                                </select>
                            </div>
                            <div className={styles.filterGroup}>
                                <label>City</label>
                                <input
                                    type="text"
                                    placeholder="Search city..."
                                    value={userFilters.city}
                                    onChange={(e) => setUserFilters({ ...userFilters, city: e.target.value })}
                                    className={`${styles.input} ${styles.inputLg}`}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Min Credits</label>
                                <input
                                    type="number"
                                    value={userFilters.minCredits}
                                    onChange={(e) => setUserFilters({ ...userFilters, minCredits: parseInt(e.target.value || '0') })}
                                    className={`${styles.input} ${styles.inputSm}`}
                                />
                            </div>
                        </div>

                        {error && <div className={styles.mutedError}>{error}</div>}

                        <div className={styles.tableScroll}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>City</th>
                                        <th>Joined</th>
                                        <th>Credits</th>
                                        <th>Subscribed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td><span className={styles.mutedText}>{u.city}</span></td>
                                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td><strong>{u.credits}</strong></td>
                                            <td>
                                                <span style={{
                                                    color: u.isSubscribed ? '#4CAF50' : 'var(--text-muted)',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {u.isSubscribed ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className={styles.tableEmptyCell}>
                                                No users found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'creditRequests' && (
                    <div className={styles.section}>
                        <div className={styles.sectionToolbar}>
                            <h3>Credit Request Approvals</h3>
                            <div className={styles.toolbarActions}>
                                <select
                                    value={creditRequestFilter}
                                    onChange={(e) => setCreditRequestFilter(e.target.value as 'ALL' | CreditRequestStatus)}
                                    className={`${styles.input} ${styles.inputXl}`}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="ALL">All Requests</option>
                                </select>
                                <button className={`${styles.saveBtn} ${styles.compactBtn}`} onClick={fetchData}>
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {error && <div className={styles.mutedError}>{error}</div>}

                        <div className={styles.tableScroll}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Credits</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Requested</th>
                                        <th>Reviewed</th>
                                        <th className={styles.actionsRight}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creditRequests.length > 0 ? creditRequests.map((request) => (
                                        <tr key={request.id}>
                                            <td>
                                                <div className={styles.userMeta}>
                                                    <strong>{request.user.name || 'Unknown User'}</strong>
                                                    <span className={styles.mutedText}>{request.user.email}</span>
                                                </div>
                                            </td>
                                            <td><strong>{request.requestedCredits}</strong></td>
                                            <td className={styles.reasonCell}>{request.reason || '-'}</td>
                                            <td>
                                                <span className={
                                                    request.status === 'APPROVED'
                                                        ? styles.approvedBadge
                                                        : request.status === 'REJECTED'
                                                            ? styles.rejectedBadge
                                                            : styles.pendingBadge
                                                }>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td>{new Date(request.createdAt).toLocaleString()}</td>
                                            <td>{request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'}</td>
                                            <td>
                                                <div className={`${styles.actions} ${styles.actionsRight}`}>
                                                    {request.status === 'PENDING' ? (
                                                        <>
                                                            <button
                                                                className={styles.approveBtn}
                                                                onClick={() => handleReviewCreditRequest(request.id, 'APPROVE')}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                className={styles.rejectBtn}
                                                                onClick={() => handleReviewCreditRequest(request.id, 'REJECT')}
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={styles.mutedText}>{request.adminNote || '-'}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className={styles.tableEmptyCell}>
                                                No credit requests found for this filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div className={styles.pricingSection}>
                        <div className={styles.section}>
                            <div className={styles.pricingToolbar}>
                                <h3>Service Credit Costs</h3>
                                <div className={styles.filterGroup}>
                                    <select
                                        className={`${styles.input} ${styles.inputLg}`}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const items = document.querySelectorAll<HTMLElement>(`.${styles.planEditor}[data-type]`);
                                            items.forEach((item) => {
                                                if (type === 'all' || item.dataset.type === type) {
                                                    item.style.display = 'block';
                                                } else {
                                                    item.style.display = 'none';
                                                }
                                            });
                                        }}
                                    >
                                        <option value="all">All Services</option>
                                        <option value="chart">Charts Only</option>
                                        <option value="other">Other Services</option>
                                    </select>
                                </div>
                            </div>
                            <p className={styles.sectionHint}>Define how many credits each service consumes.</p>
                            <div className={styles.pricingList}>
                                {services.map(service => (
                                    <div
                                        key={service.key}
                                        className={styles.planEditor}
                                        data-type={service.key.startsWith('CHART_') ? 'chart' : 'other'}
                                    >
                                        <div className={styles.planHeader}>
                                            <h4>{service.key.replace('CHART_', '')}</h4>
                                            <span className={styles.planKey}>{service.key.startsWith('CHART_') ? 'Chart Unlock' : 'Action'}</span>
                                        </div>
                                        <div className={styles.planBody}>
                                            <label>Credits Required</label>
                                            <div className={styles.priceInputGroup}>
                                                <input
                                                    type="number"
                                                    defaultValue={service.credits}
                                                    id={`service-${service.key}`}
                                                    min="0"
                                                />
                                                <button
                                                    className={styles.saveBtn}
                                                    onClick={() => {
                                                        const val = (document.getElementById(`service-${service.key}`) as HTMLInputElement).value;
                                                        handleUpdateServiceCost(service.key, parseInt(val));
                                                    }}
                                                >
                                                    Update
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section} style={{ marginTop: '3rem' }}>
                            <h3>Credit Pricing Plans</h3>
                            <p className={styles.sectionHint}>Set the valid purchase plans for users.</p>
                            <div className={styles.pricingList}>
                                {plans.map(plan => (
                                    <div key={plan.key} className={styles.planEditor}>
                                        <div className={styles.planHeader}>
                                            <h4>{plan.name}</h4>
                                            <span className={styles.planKey}>{plan.key}</span>
                                        </div>
                                        <div className={styles.planBody}>
                                            <label>Price (₹)</label>
                                            <div className={styles.priceInputGroup}>
                                                <input
                                                    type="number"
                                                    defaultValue={plan.price / 100}
                                                    id={`price-${plan.key}`}
                                                />
                                                <button
                                                    className={styles.saveBtn}
                                                    onClick={() => {
                                                        const val = (document.getElementById(`price-${plan.key}`) as HTMLInputElement).value;
                                                        handleUpdatePrice(plan.key, parseFloat(val));
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'newsletter' && (
                    <div className={styles.newsletterSection}>
                        <h3>Compose Newsletter</h3>
                        <div className={styles.formGroup}>
                            <label>Subject</label>
                            <input
                                type="text"
                                value={newsletterSubject}
                                onChange={(e) => setNewsletterSubject(e.target.value)}
                                placeholder="Enter email subject"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Content (HTML supported)</label>
                            <textarea
                                value={newsletterContent}
                                onChange={(e) => setNewsletterContent(e.target.value)}
                                rows={10}
                                placeholder="Write your update here... Use <br> for new lines, <b> for bold."
                                className={styles.textarea}
                            />
                        </div>
                        <button
                            className={styles.sendBtn}
                            onClick={handleSendNewsletter}
                            disabled={sendingNewsletter || !newsletterSubject || !newsletterContent}
                        >
                            {sendingNewsletter ? 'Sending...' : 'Send Broadcast'}
                        </button>
                    </div>
                )}

                {activeTab === 'lifecycle' && (
                    <div className={styles.lifecycleSection}>
                        <div className={styles.sectionToolbar}>
                            <div>
                                <h3>Lifecycle Campaigns</h3>
                                <p className={styles.sectionHint}>
                                    Retention emails for onboarding, abandoned top-ups, clarity re-engagement, and low-credit recovery.
                                </p>
                            </div>
                            <div className={styles.lifecycleActionGroup}>
                                <button
                                    className={styles.saveBtn}
                                    onClick={() => handleRunLifecycleCampaign('all')}
                                    disabled={runningLifecycle !== null}
                                >
                                    {runningLifecycle === 'all' ? 'Running All...' : 'Run All'}
                                </button>
                                <button
                                    className={styles.editBtn}
                                    onClick={() => handleRunLifecycleCampaign('abandoned_topup')}
                                    disabled={runningLifecycle !== null}
                                >
                                    {runningLifecycle === 'abandoned_topup' ? 'Running...' : 'Run Abandoned Top-Up'}
                                </button>
                                <button
                                    className={styles.editBtn}
                                    onClick={() => handleRunLifecycleCampaign('clarity_reengagement')}
                                    disabled={runningLifecycle !== null}
                                >
                                    {runningLifecycle === 'clarity_reengagement' ? 'Running...' : 'Run Clarity Re-engagement'}
                                </button>
                            </div>
                        </div>

                        {lifecycleMessage && <div className={styles.lifecycleMessage}>{lifecycleMessage}</div>}
                        {error && <div className={styles.mutedError}>{error}</div>}

                        <div className={styles.lifecycleStatusCard}>
                            <div className={styles.campaignMeta}>
                                <strong>Automation Status</strong>
                                <span className={`${lifecycleData?.automation?.lastTrafficRunAt ? styles.approvedBadge : styles.pendingBadge} ${styles.statusInline}`}>
                                    {lifecycleData?.automation?.lastTrafficRunAt ? 'active' : 'warming'}
                                </span>
                            </div>
                            <p className={styles.sectionHint}>
                                {lifecycleData?.automation?.description || 'Runs automatically from normal site activity without cron.'}
                            </p>
                            <div className={styles.lifecycleStatusGrid}>
                                <div>
                                    <span className={styles.mutedText}>Mode</span>
                                    <p>{lifecycleData?.automation?.mode || 'traffic'}</p>
                                </div>
                                <div>
                                    <span className={styles.mutedText}>Trigger Source</span>
                                    <p>{lifecycleData?.automation?.triggerSource || 'internal analytics tracking'}</p>
                                </div>
                                <div>
                                    <span className={styles.mutedText}>Abandoned Top-Up Window</span>
                                    <p>Every {lifecycleData?.automation?.abandonedTopUpWindowHours || 6} hours when traffic occurs</p>
                                </div>
                                <div>
                                    <span className={styles.mutedText}>Clarity Re-engagement Window</span>
                                    <p>Every {lifecycleData?.automation?.clarityReengagementWindowHours || 12} hours when traffic occurs</p>
                                </div>
                                <div>
                                    <span className={styles.mutedText}>Default Traffic Limit</span>
                                    <p>{lifecycleData?.automation?.defaultTrafficLimit || 25}</p>
                                </div>
                                <div>
                                    <span className={styles.mutedText}>Last Traffic Run</span>
                                    <p>{lifecycleData?.automation?.lastTrafficRunAt ? new Date(lifecycleData.automation.lastTrafficRunAt).toLocaleString() : 'No automatic run yet'}</p>
                                </div>
                                <div>
                                    <span className={styles.mutedText}>Attribution Window</span>
                                    <p>{lifecycleData?.conversionWindowDays || 7} days after send</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.campaignSummaryGrid}>
                            {lifecycleData?.summary?.length ? lifecycleData.summary.map((item) => (
                                <div
                                    key={`${item.campaignKey}-${item.status}`}
                                    className={styles.campaignSummaryCard}
                                >
                                    <div className={styles.campaignMeta}>
                                        <strong>{formatLifecycleCampaign(item.campaignKey)}</strong>
                                        <span className={`${getLifecycleStatusClassName(item.status)} ${styles.statusInline}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className={styles.statValue}>{item._count._all}</p>
                                    <p className={styles.mutedText}>Last {lifecycleData?.lookbackDays || 30} days</p>
                                </div>
                            )) : (
                                <div className={styles.emptyPanel}>No lifecycle email activity in the last 30 days yet.</div>
                            )}
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionToolbar}>
                                <div>
                                    <h3>Campaign Performance</h3>
                                    <p className={styles.sectionHint}>
                                        Attributed to activity within {lifecycleData?.conversionWindowDays || 7} days after each sent email.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.tableScroll}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Sent</th>
                                            <th>Recipients</th>
                                            <th>Re-engaged</th>
                                            <th>Checkouts</th>
                                            <th>Payments</th>
                                            <th>Conv.</th>
                                            <th>Revenue</th>
                                            <th>Product Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lifecycleData?.performance?.length ? lifecycleData.performance.map((item) => (
                                            <tr key={item.campaignKey}>
                                                <td>{formatLifecycleCampaign(item.campaignKey)}</td>
                                                <td><strong>{item.sent}</strong></td>
                                                <td>{item.uniqueRecipients}</td>
                                                <td>{item.reengagedUsers}</td>
                                                <td>{item.checkoutUsers}</td>
                                                <td>{item.paymentUsers}</td>
                                                <td>{item.paymentConversionRate}%</td>
                                                <td>₹{item.revenue.toLocaleString()}</td>
                                                <td className={styles.reasonCell}>
                                                    Clarity {item.clarityUsers} | Charts {item.chartUnlockUsers} | Report unlocks {item.reportUnlockUsers} | Report generations {item.reportStartUsers} | Expansions {item.profileExpansionUsers}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={9} className={styles.tableEmptyCell}>
                                                    No campaign performance data yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionToolbar}>
                                <h3>Recent Automation Runs</h3>
                            </div>
                            <div className={styles.tableScroll}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Trigger</th>
                                            <th>Status</th>
                                            <th>Attempted</th>
                                            <th>Sent</th>
                                            <th>Skipped</th>
                                            <th>Failed</th>
                                            <th>Ran At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lifecycleData?.recentRuns?.length ? lifecycleData.recentRuns.map((item) => (
                                            <tr key={item.id}>
                                                <td>{formatLifecycleCampaign(item.campaignKey)}</td>
                                                <td><span className={styles.mutedText}>{item.triggerType}</span></td>
                                                <td>
                                                    <span className={`${getLifecycleStatusClassName(item.status)} ${styles.statusInline}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>{item.attempted}</td>
                                                <td>{item.sent}</td>
                                                <td>{item.skipped}</td>
                                                <td>{item.failed}</td>
                                                <td>{new Date(item.createdAt).toLocaleString()}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8} className={styles.tableEmptyCell}>
                                                    No automation runs logged yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionToolbar}>
                                <h3>Recent Lifecycle Emails</h3>
                                <button className={`${styles.saveBtn} ${styles.compactBtn}`} onClick={fetchData}>
                                    Refresh
                                </button>
                            </div>
                            <div className={styles.tableScroll}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>User</th>
                                            <th>Subject</th>
                                            <th>Status</th>
                                            <th>Queued</th>
                                            <th>Sent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lifecycleData?.recent?.length ? lifecycleData.recent.map((item) => (
                                            <tr key={item.id}>
                                                <td>{formatLifecycleCampaign(item.campaignKey)}</td>
                                                <td>
                                                    <div className={styles.userMeta}>
                                                        <strong>{item.user.name || 'Unknown User'}</strong>
                                                        <span className={styles.mutedText}>{item.user.email || 'No email'}</span>
                                                    </div>
                                                </td>
                                                <td>{item.subject}</td>
                                                <td>
                                                    <span className={`${getLifecycleStatusClassName(item.status)} ${styles.statusInline}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(item.createdAt).toLocaleString()}</td>
                                                <td>{item.sentAt ? new Date(item.sentAt).toLocaleString() : '-'}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6} className={styles.tableEmptyCell}>
                                                    No lifecycle emails found yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'blogs' && (
                    <div className={styles.section}>
                        <div className={styles.sectionToolbar}>
                            <h3>Blog Management</h3>
                            <button
                                className={styles.saveBtn}
                                onClick={() => router.push('/admin/blog')}
                            >
                                + Create New Blog
                            </button>
                        </div>

                        <div className={styles.tableScroll}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Created At</th>
                                        <th className={styles.actionsRight}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blogs.length > 0 ? blogs.map((blog) => (
                                        <tr key={blog.id}>
                                            <td>{blog.title}</td>
                                            <td>{new Date(blog.createdAt).toLocaleDateString()} at {new Date(blog.createdAt).toLocaleTimeString()}</td>
                                            <td>
                                                <div className={`${styles.actions} ${styles.actionsRight}`}>
                                                    <button
                                                        className={styles.editBtn}
                                                        onClick={() => router.push(`/admin/blog?id=${blog.id}`)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={() => handleDeleteBlog(blog.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className={styles.tableEmptyCell}>
                                                No blogs found. Start by creating one!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
}
