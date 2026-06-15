'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Lock,
    Sparkles,
    FileText,
    Download,
    Crown,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import styles from './page.module.css';
import ChartDisplay from '@/components/ChartDisplay';
import ProfileGuard from '@/components/ProfileGuard';
import { buildPricingUrl } from '@/lib/monetization';

interface ReportPageProps {
    params: Promise<{ id: string }>;
}

type ReportPageProfile = {
    id: string;
    name: string;
    chartData: any;
};

type ReportPageReport = {
    id?: string;
    status?: 'pending' | 'purchased' | 'generated';
    content?: Record<string, unknown> | null;
    updatedAt?: string;
};

function ReportContent({ params }: ReportPageProps) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ReportPageProfile | null>(null);
    const [report, setReport] = useState<ReportPageReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);

    const hasPurchaseSuccess = searchParams.get('purchase') === 'success';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/reports/${id}`);
                if (!res.ok) {
                    throw new Error('Failed to load report data');
                }

                const data = await res.json();
                setProfile(data.profile);
                setReport(data.report);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load report data');
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [id]);

    const handlePurchase = async () => {
        try {
            setLoading(true);
            setPurchaseError(null);
            const res = await fetch(`/api/reports/${id}/purchase`, { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 402) {
                    setPurchaseError(data.message || 'You need more credits to unlock this report.');
                    return;
                }

                throw new Error(data.message || data.error || 'Purchase failed');
            }

            setReport((current) => ({
                ...current,
                status: 'purchased',
            }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Purchase failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/reports/${id}/generate`, { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Generation failed');
            }

            setReport((current) => ({
                ...current,
                status: 'generated',
                content: data.content,
                updatedAt: new Date().toISOString(),
            }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !profile) {
        return <div className={styles.loading}>Retrieving cosmic data...</div>;
    }

    if (error || !profile || !report) {
        return <div className={styles.error}>{error || 'Failed to load report data'}</div>;
    }

    const isPurchased = report.status === 'purchased' || report.status === 'generated';
    const reportPricingUrl = buildPricingUrl({
        intent: 'report',
        source: purchaseError ? 'report_unlock_blocked' : 'report_paywall',
        returnTo: `/report/${id}`,
    });

    return (
        <div className={styles.reportPage}>
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backLink}>
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </Link>
                <div className={styles.meta}>
                    <Crown size={20} className={styles.premiumIcon} />
                    <span className={styles.tagline}>Premium Life Guidance</span>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.cover}>
                    <div className={styles.orb}></div>
                    <h1 className={styles.title}>The Life Guidance Report</h1>
                    <p className={styles.subtitle}>Prepared exclusively for <strong>{profile.name}</strong></p>
                    <div className={styles.divider}></div>
                </section>

                {hasPurchaseSuccess && (
                    <section className={styles.purchaseNotice}>
                        <strong>Credits added.</strong> You&apos;re ready to unlock this report whenever you want to continue.
                    </section>
                )}

                <section className={styles.vargasGrid}>
                    <div className={styles.vargaCard}>
                        <h3>D1: The Physical Self</h3>
                        <div className={styles.chartWrapper}>
                            <ChartDisplay data={profile.chartData} />
                        </div>
                        <p className={styles.vargaDesc}>Your baseline personality and physical journey.</p>
                    </div>

                    <div className={styles.vargaCard}>
                        <h3>D9: The Soul Journey</h3>
                        <div className={styles.chartWrapper}>
                            <ChartDisplay data={{
                                planets: Object.fromEntries(profile.chartData?.vargas?.d9?.planets?.map((planet: any) => [planet.name, planet]) || []),
                                houses: profile.chartData?.houses,
                                ascendant: profile.chartData?.vargas?.d9?.ascendant?.longitude,
                                navamsaAscendant: profile.chartData?.vargas?.d9?.ascendant?.rasi?.toString(),
                            }} />
                        </div>
                        <p className={styles.vargaDesc}>Your inner strength and marital destiny.</p>
                    </div>

                    <div className={styles.vargaCard}>
                        <h3>D10: Career &amp; Status</h3>
                        <div className={styles.chartWrapper}>
                            <ChartDisplay data={{
                                planets: Object.fromEntries(profile.chartData?.vargas?.d10?.planets?.map((planet: any) => [planet.name, planet]) || []),
                                houses: profile.chartData?.houses,
                                ascendant: profile.chartData?.vargas?.d10?.ascendant?.longitude,
                                navamsaAscendant: profile.chartData?.vargas?.d10?.ascendant?.rasi?.toString(),
                            }} />
                        </div>
                        <p className={styles.vargaDesc}>Professional growth and public recognition.</p>
                    </div>
                </section>

                {!isPurchased ? (
                    <section className={styles.paywall}>
                        <div className={styles.lockIcon}>
                            <Lock size={48} />
                        </div>
                        <h2>Unveil Your Full Cosmic Blueprint</h2>
                        <p>
                            Your surface chart is just the beginning. The full 18-page report delves deep into
                            your soul&apos;s purpose, career pitfalls, and relationship karma.
                        </p>

                        <div className={styles.featureList}>
                            <div className={styles.featureItem}>
                                <Sparkles size={18} />
                                <span>Deep analysis of D9 (Navmansha) &amp; D10 (Dashmansha)</span>
                            </div>
                            <div className={styles.featureItem}>
                                <ShieldCheck size={18} />
                                <span>Karmic lessons and conscious remedies</span>
                            </div>
                            <div className={styles.featureItem}>
                                <FileText size={18} />
                                <span>Lifetime access with downloadable PDF</span>
                            </div>
                        </div>

                        <button className={styles.purchaseBtn} onClick={handlePurchase} disabled={loading}>
                            <Crown size={20} />
                            {loading ? 'Processing...' : 'Unlock Full Report (99 Credits)'}
                        </button>

                        {purchaseError ? (
                            <div className={styles.purchaseHelpBox}>
                                <p>{purchaseError}</p>
                                <div className={styles.purchaseActions}>
                                    <Link href={reportPricingUrl} className={styles.purchaseSecondaryLink}>
                                        Top Up and Return
                                    </Link>
                                    <Link href="/clarity" className={styles.purchaseSecondaryLink}>
                                        Start Smaller with Clarity
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <p className={styles.topUpHint}>
                                Need more credits first? <Link href={reportPricingUrl}>Top up and come right back.</Link>
                            </p>
                        )}

                        <p className={styles.refundNote}>Valid for Life • Secure Cosmic Insights</p>
                    </section>
                ) : (
                    <section className={styles.reportContent}>
                        <div className={styles.generationStatus}>
                            {report.status === 'purchased' ? (
                                <div className={styles.startGen}>
                                    <Zap size={32} className={styles.zap} />
                                    <h3>Insight Ready to Be Woven</h3>
                                    <p>Our AI is ready to synthesize your charts into a personalized narrative.</p>
                                    <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
                                        {loading ? 'Synthesizing...' : 'Generate Full Insight'}
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.fullReport}>
                                    <div className={styles.statusLine}>
                                        <div className={styles.statusInfo}>
                                            <FileText size={20} className={styles.statusIcon} />
                                            <div>
                                                <span className={styles.statusLabel}>Premium Life Guidance</span>
                                                <span className={styles.statusDate}>Generated on {new Date(report.updatedAt || Date.now()).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className={styles.statusActions}>
                                            <button onClick={handleGenerate} className={styles.refreshBtn} title="Refresh Report Content">
                                                <Zap size={16} /> Refresh
                                            </button>
                                            <a href={`/api/reports/${id}/download`} className={styles.downloadBtn} target="_blank">
                                                <Download size={18} />
                                                Download PDF
                                            </a>
                                        </div>
                                    </div>

                                    {!report.content?.chapter1_SoulPurpose ? (
                                        <div className={styles.emptyContentState}>
                                            <h3>Report Generation Required</h3>
                                            <p>Your premium life guidance is waiting to be synthesized.</p>
                                            <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
                                                {loading ? 'Synthesizing...' : 'Generate Report Now'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.downloadCenter}>
                                            <div className={styles.downloadCard}>
                                                <div className={styles.fileIcon}>
                                                    <FileText size={64} strokeWidth={1} />
                                                </div>
                                                <h2>Your Guidance is Ready</h2>
                                                <p>Your 10-chapter Premium Life Report has been generated and compiled into a secure PDF document.</p>

                                                <div className={styles.actionRow}>
                                                    <a href={`/api/reports/${id}/download`} className={styles.primaryDownloadBtn} target="_blank">
                                                        <Download size={20} />
                                                        Download PDF Report
                                                    </a>
                                                </div>

                                                <button onClick={handleGenerate} className={styles.textRegenBtn} disabled={loading}>
                                                    {loading ? 'Updating...' : 'Regenerate Analysis'}
                                                </button>
                                                <p className={styles.subtext}>
                                                    Regenerating will overwrite the existing report with fresh insights.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>

            {loading && <div className={styles.overlay}><div className={styles.spinner}></div></div>}
        </div>
    );
}

export default function ReportPage({ params }: ReportPageProps) {
    return (
        <ProfileGuard>
            <ReportContent params={params} />
        </ProfileGuard>
    );
}
