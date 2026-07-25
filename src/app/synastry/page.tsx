'use client';

import { useState } from 'react';
import { UserPlus, Check } from 'lucide-react';
import styles from './page.module.css';
import ProfileSelector from '@/components/ProfileSelector';
import { UserProfile } from '@/components/BirthDataForm';
import Term from '@/components/Term';
import DisclaimerNote from '@/components/DisclaimerNote';

export default function SynastryPage() {
    const [personA, setPersonA] = useState<UserProfile | null>(null);
    const [personB, setPersonB] = useState<UserProfile | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [inviteCopied, setInviteCopied] = useState(false);

    const handleInvite = async () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://askchetna.com';
        const inviteUrl = `${origin}/synastry`;
        const text = `Let's see how our charts connect on Chetna — compare yours with mine: ${inviteUrl}`;
        try {
            const { shareContent } = await import('@/lib/native/share');
            const outcome = await shareContent({
                title: 'Compare charts on Chetna',
                text,
                url: inviteUrl,
            });

            // Only show the "copied" confirmation when the clipboard was really
            // used, not when the native share sheet handled it.
            if (outcome === 'copied') {
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2500);
            }
        } catch {
            // Share sheet cancelled — no action needed
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setShowResult(false);
        setError(null);

        try {
            const response = await fetch('/api/astrology/synastry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personA, personB }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Analysis failed');
            }

            const data = await response.json();
            setResult(data);
            setShowResult(true);
        } catch (err: any) {
            console.error('Synastry error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className={`container ${styles.container}`}>
            <h1 className={styles.title}>Relationship Dynamics</h1>
            <p className={styles.subtitle}>
                Understand the flow of energy between two charts — what astrologers call{' '}
                <Term termKey="synastry">synastry</Term>. No judgments, just patterns.
            </p>

            {/* Invite a Friend flow (7.1) */}
            <div className={styles.inviteBar}>
                <span>See how you connect with someone — invite them to compare charts.</span>
                <button onClick={handleInvite} className={styles.inviteBtn}>
                    {inviteCopied ? <><Check size={16} /> Link copied</> : <><UserPlus size={16} /> Invite a Friend</>}
                </button>
            </div>

            <div className={styles.selectorGrid}>
                <div className={styles.profileSlot}>
                    <h3>Person A</h3>
                    {personA ? (
                        <div className={styles.selectedCard}>
                            <span className={styles.name}>{personA.name}</span>
                            <button onClick={() => { setPersonA(null); setShowResult(false); }} className={styles.changeBtn}>Change</button>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Select a profile</p>
                            <ProfileSelector onSelect={setPersonA} />
                        </div>
                    )}
                </div>

                <div className={styles.connector}>+</div>

                <div className={styles.profileSlot}>
                    <h3>Person B</h3>
                    {personB ? (
                        <div className={styles.selectedCard}>
                            <span className={styles.name}>{personB.name}</span>
                            <button onClick={() => { setPersonB(null); setShowResult(false); }} className={styles.changeBtn}>Change</button>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Select a profile</p>
                            <ProfileSelector onSelect={setPersonB} />
                        </div>
                    )}
                </div>
            </div>

            <button
                className={styles.analyzeBtn}
                disabled={!personA || !personB || isAnalyzing}
                onClick={handleAnalyze}
            >
                {isAnalyzing ? 'Connecting Charts...' : 'Analyze Synergy'}
            </button>

            {error && (
                <div className={styles.errorBox}>
                    <p>{error}</p>
                </div>
            )}

            {showResult && result && (
                <div className={styles.resultSection}>
                    <div className={styles.overviewCard}>
                        <h3>Energetic Overview</h3>
                        <p>{result.aiAnalysis.connectionOverview}</p>
                    </div>

                    <div className={styles.vennContainer}>
                        <div className={`${styles.circle} ${styles.circleA}`}>
                            <div className={styles.planetLabel}>Moon</div>
                            {personA?.name.split(' ')[0]}
                        </div>
                        <div className={`${styles.circle} ${styles.circleB}`}>
                            <div className={styles.planetLabel}>Moon</div>
                            {personB?.name.split(' ')[0]}
                        </div>
                        <div className={styles.intersectionLabel}>Growth</div>
                    </div>

                    <div className={styles.insightsList}>
                        <div className={styles.insightCard}>
                            <h4>Magnetic Pull</h4>
                            <p>{result.aiAnalysis.magneticPull}</p>
                        </div>
                        <div className={styles.insightCard}>
                            <h4>Communication Flow</h4>
                            <p>{result.aiAnalysis.communicationFlow}</p>
                        </div>
                    </div>

                    <div className={styles.resonanceSection}>
                        <h3>Daily Resonance (Tara Bala)</h3>
                        <div className={styles.resonanceGrid}>
                            <div className={styles.resCard}>
                                <h5>{personA?.name}&apos;s Experience of {personB?.name.split(' ')[0]}</h5>
                                <div className={`${styles.taraBadge} ${styles[result.taraBala.personA_affectedByB.score]}`}>
                                    {result.taraBala.personA_affectedByB.name}
                                </div>
                                <p>{result.taraBala.personA_affectedByB.interpretation}</p>
                            </div>
                            <div className={styles.resCard}>
                                <h5>{personB?.name}&apos;s Experience of {personA?.name.split(' ')[0]}</h5>
                                <div className={`${styles.taraBadge} ${styles[result.taraBala.personB_affectedByA.score]}`}>
                                    {result.taraBala.personB_affectedByA.name}
                                </div>
                                <p>{result.taraBala.personB_affectedByA.interpretation}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.tipsSection}>
                        <h3>Nurturing the Connection</h3>
                        <ul className={styles.tipsList}>
                            {result.aiAnalysis.harmonyTips.map((tip: string, i: number) => (
                                <li key={i}>{tip}</li>
                            ))}
                        </ul>
                    </div>

                    {/* What this relationship teaches you (7.3) */}
                    {result.aiAnalysis.growthEdges && result.aiAnalysis.growthEdges.length > 0 && (
                        <div className={styles.teachesSection}>
                            <h3>What This Dynamic Is Here to Help You Learn</h3>
                            <p className={styles.teachesIntro}>
                                Every connection is a mirror. Beyond compatibility, this relationship invites both of you to grow in specific ways:
                            </p>
                            <ul className={styles.teachesList}>
                                {result.aiAnalysis.growthEdges.map((edge: string, i: number) => (
                                    <li key={i}>{edge}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <DisclaimerNote />
        </div>
    );
}
