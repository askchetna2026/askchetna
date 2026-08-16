'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Send, Sparkles, MessageSquare, History, ArrowLeft, Bookmark, Share2, ShieldCheck, Check, Download } from 'lucide-react';
import styles from '../app/clarity/page.module.css';

import ProfileGuard from '@/components/ProfileGuard';
import { buildPricingUrl } from '@/lib/monetization';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';

const LOADING_MESSAGES = [
    "Calculating your Ascendant…",
    "Mapping your Dasha periods…",
    "Reading your Navamsa chart…",
    "Tracing the pattern behind your question…",
    "Composing your reflection…"
];

export default function ClarityPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialQuery = searchParams.get('q') || '';
    const hasPurchaseSuccess = searchParams.get('purchase') === 'success';

    const [question, setQuestion] = useState(initialQuery);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [showSample, setShowSample] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [shareMsg, setShareMsg] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const STARTER_QUESTIONS = [
        "Why do I keep self-sabotaging when things go well?",
        "Why do I attract emotionally unavailable people?",
        "What is my current Dasha phase about?",
        "I feel stuck in my career — what patterns might explain this?"
    ];

    const [result, setResult] = useState<null | {
        questionContext: string;
        phaseOverview: string;
        decisionTreeSteps: string[];
        finalVerdict: string;
        patternInsights: string[];
        actionGuidance: string[];
        reflectiveQuestions: string[];
        ethicalClosing: string;
    }>(null);

    const triggerAsk = useCallback(async (q: string) => {
        setIsAnalyzing(true);
        setResult(null);
        setError(null);

        // Asking spends a credit, so acknowledge the commitment physically. In the
        // apps this is a real haptic; on the web it's a no-op.
        const haptics = await import('@/lib/native/haptics');
        void haptics.commitFeedback();

        try {
            const response = await fetch('/api/clarity/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q }),
            });

            const data = await response.json();

            if (response.status === 401) {
                router.push(`/login?callbackUrl=/clarity?q=${encodeURIComponent(q)}`);
                return;
            }

            if (response.status === 402) {
                setError(
                    PAYMENTS_ENABLED
                        ? "You've run out of credits. Please purchase more to seek clarity."
                        : `You've run out of credits. ${PAYMENTS_PAUSED_MESSAGE}`
                );
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get insights');
            }

            setResult(data.response);
            setCredits(data.remainingCredits);
            setQuestion(''); // Clear the question box for the next question
            // The reading can take a while; a success buzz means the user doesn't
            // have to watch the screen waiting for it.
            void haptics.successFeedback();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            void haptics.errorFeedback();
        } finally {
            setIsAnalyzing(false);
        }
    }, [router]);

    // Auto-trigger if question comes from homepage
    useEffect(() => {
        if (initialQuery && initialQuery.length >= 10) {
            triggerAsk(initialQuery);
        }

        const fetchCredits = async () => {
            try {
                const res = await fetch('/api/credits/check');
                if (res.ok) {
                    const data = await res.json();
                    setCredits(data.totalCredits);
                }
            } catch (err) {
                console.error('Failed to fetch credits:', err);
            }
        };
        fetchCredits();
    }, [initialQuery, triggerAsk]);

    const handleAsk = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || question.length < 10) return;
        triggerAsk(question);
    };

    // Cycle the step-by-step loading messages while analyzing
    useEffect(() => {
        if (!isAnalyzing) {
            setLoadingStep(0);
            return;
        }
        const interval = setInterval(() => {
            setLoadingStep((s) => (s + 1) % LOADING_MESSAGES.length);
        }, 1400);
        return () => clearInterval(interval);
    }, [isAnalyzing]);

    /**
     * Keep this reading.
     *
     * This used to write the answer into localStorage under
     * `chetna-saved-insights`, where nothing ever read it back — so the button
     * said "Saved", the reading was never shown again, and it disappeared on a
     * second device or a cleared cache. It now goes to the server and is listed
     * at /saved.
     */
    const handleSaveResponse = async () => {
        if (!result || saving) return;
        setSaving(true);
        try {
            // Flattened to the prose a reader would want back, in the order it
            // was shown. Storing the raw object would mean /saved had to know
            // the shape of a clarity answer for ever.
            const body = [
                result.phaseOverview,
                result.finalVerdict,
                result.patternInsights?.length
                    ? `What repeats:\n${result.patternInsights.map((p) => `• ${p}`).join('\n')}`
                    : '',
                result.actionGuidance?.length
                    ? `Where to put your attention:\n${result.actionGuidance.map((a) => `• ${a}`).join('\n')}`
                    : '',
                result.reflectiveQuestions?.length
                    ? `To sit with:\n${result.reflectiveQuestions.map((q) => `• ${q}`).join('\n')}`
                    : '',
            ]
                .filter(Boolean)
                .join('\n\n');

            const res = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'clarity',
                    title: result.questionContext,
                    body,
                    href: '/saved',
                }),
            });

            if (!res.ok) {
                setSaveMsg('Could not save that');
                setTimeout(() => setSaveMsg(null), 2500);
                return;
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Failed to save insight:', err);
            setSaveMsg('Could not save that');
            setTimeout(() => setSaveMsg(null), 2500);
        } finally {
            setSaving(false);
        }
    };

    const handleShareResponse = async () => {
        if (!result) return;
        const text = `Chetna AI reflection on: "${result.questionContext}"\n\n${result.phaseOverview}\n\nExplore yours at askchetna.com`;
        try {
            const { shareContent } = await import('@/lib/native/share');
            const outcome = await shareContent({ title: 'My Chetna AI Insight', text });

            // Only claim "copied" when it actually was. The previous version showed
            // that message on every non-share path, including outright failure.
            if (outcome === 'copied') {
                setShareMsg('Copied to clipboard');
                setTimeout(() => setShareMsg(null), 2500);
            } else if (outcome === 'failed') {
                setShareMsg('Could not share');
                setTimeout(() => setShareMsg(null), 2500);
            }
        } catch (err) {
            console.error('Failed to share:', err);
        }
    };
    const handleDownloadResponse = async () => {
        if (!result) return;
        setIsDownloading(true);
        try {
            const res = await fetch('/api/clarity/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result })
            });

            if (res.ok) {
                const blob = await res.blob();
                
                const { isClientNativeApp } = await import('@/lib/platform');
                if (isClientNativeApp()) {
                    const { shareContent } = await import('@/lib/native/share');
                    const outcome = await shareContent({
                        title: 'Chetna Clarity Report',
                        text: 'Here is your Chetna Clarity Report.',
                        file: { blob, name: 'Chetna_Clarity_Report.pdf' }
                    });
                    
                    if (outcome === 'failed') {
                        alert('Failed to save or share PDF');
                    }
                } else {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Chetna_Clarity_Report.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }
            } else {
                alert('Failed to generate PDF');
            }
        } catch (e) {
            console.error('Error exporting PDF:', e);
            alert('Error exporting PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
        visible: { 
            opacity: 1, 
            y: 0, 
            filter: 'blur(0px)', 
            transition: { duration: 0.8, ease: "circOut" } 
        }
    };

    const clarityPricingUrl = buildPricingUrl({
        intent: 'clarity',
        source: error?.includes('credits') ? 'clarity_credit_block' : 'clarity_topup',
        returnTo: '/clarity',
    });
    const lowCreditMode = credits !== null && credits > 0 && credits <= 2;

    return (
        <ProfileGuard>
            <div className={`container ${styles.pageContainer}`}>
                <div className={styles.historyHeader}>
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeft size={16} /> Dashboard
                    </Link>
                    {credits !== null && (
                        <div className={styles.historyMeta}>
                            <div className={styles.historyLabel}>ENERGY UNITS</div>
                            <div className={styles.historyDate}>{credits} AVAILABLE</div>
                        </div>
                    )}
                </div>

                {hasPurchaseSuccess && PAYMENTS_ENABLED && (
                    <div className={styles.rulesBox} style={{ marginBottom: '20px', borderColor: 'rgba(var(--accent-gold-rgb), 0.35)' }}>
                        <h3>Credits Added</h3>
                        <p style={{ marginBottom: '16px' }}>
                            Your account is topped up. If the question still feels alive, this is a good moment to keep going.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className={styles.actionLink}
                                onClick={() => {
                                    const input = document.querySelector('textarea');
                                    if (input instanceof HTMLTextAreaElement) {
                                        input.focus();
                                    }
                                }}
                            >
                                Continue Asking
                            </button>
                        </div>
                    </div>
                )}

                {lowCreditMode && !error && (
                    <div className={styles.rulesBox} style={{ marginBottom: '20px' }}>
                        <h3>Low Credit Reminder</h3>
                        <p style={{ marginBottom: '16px' }}>
                            You have {credits} credit{credits === 1 ? '' : 's'} left. If you want room for follow-up questions, this is a good time to top up before you lose the thread.
                        </p>
                        {PAYMENTS_ENABLED && (
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <Link href={clarityPricingUrl} className={styles.actionLink}>Top Up for More Clarity</Link>
                            </div>
                        )}
                    </div>
                )}

                <motion.h1 
                    className={styles.title}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                >
                    Oracle Portal
                </motion.h1>
                <motion.p 
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 1 }}
                >
                    Speak your question. Understand the patterns. Act with awareness.
                </motion.p>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div 
                            key="error"
                            className={styles.errorBox}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <p>{error}</p>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                                {error.includes('credits') && (
                                    PAYMENTS_ENABLED ? (
                                        <Link href={clarityPricingUrl} className={styles.actionLink}>Buy Credits</Link>
                                    ) : null
                                )}
                                {error.includes('chart') && (
                                    <Link href="/chart" className={styles.actionLink}>Create Chart</Link>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {!result && !isAnalyzing && !error && (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.initialStateContainer}
                            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                        >
                            <motion.div 
                                className={styles.rulesBox}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <h3>Seekers Principles</h3>
                                <ul>
                                    <li>Ask focused questions for maximum resonance</li>
                                    <li>Observe patterns behind events, not just outcomes</li>
                                    <li>Astrology offers perspective, not prescription</li>
                                </ul>
                            </motion.div>

                            {/* Collapsible Sample Response Preview */}
                            <motion.div 
                                className={styles.sampleResponseCollapse}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div 
                                    className={styles.sampleResponseHeader} 
                                    onClick={() => setShowSample(!showSample)}
                                >
                                    <span>💡 See an example response</span>
                                    <span>{showSample ? '▲ Collapse' : '▼ Expand'}</span>
                                </div>
                                <AnimatePresence>
                                    {showSample && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className={styles.sampleResponseContent}
                                        >
                                            <p style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '8px' }}>
                                                Question: &ldquo;Why do I hold onto control when things are going well?&rdquo;
                                            </p>
                                            <p style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                                                <strong>1. Chart Observation:</strong> Your Moon is placed in the 8th House in Scorpio, conjunct Saturn. This indicates a deeply feeling nature that associates emotional vulnerability with insecurity.
                                            </p>
                                            <p style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                                                <strong>2. Pattern Explanation:</strong> When life is stable, your Saturnian influence anticipates a drop or crisis to protect itself. You default to hyper-vigilance or micro-managing outcomes to maintain safety, which drains your energy.
                                            </p>
                                            <p style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                                                <strong>3. What Helps / What to Avoid:</strong> Notice the exact moment you begin to over-plan. Gently remind yourself that stability is not a threat. Avoid trying to predict the outcome of every conversation.
                                            </p>
                                            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '12px' }}>
                                                <strong>4. Free-Will Reminder:</strong> This is the energetic pattern at play. What you do with this awareness in the present moment is entirely your choice.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Starter Question Chips */}
                            <motion.div 
                                className={styles.chipsContainer}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: 0.2 }}
                            >
                                {STARTER_QUESTIONS.map((q, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => { setQuestion(q); }}
                                        className={styles.chip}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}

                    {isAnalyzing && (
                        <motion.div 
                            key="analyzing"
                            className={styles.loadingState}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className={styles.orb}></div>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={loadingStep}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    {LOADING_MESSAGES[loadingStep]}
                                </motion.p>
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {result && !isAnalyzing && (
                        <motion.div 
                            key="result"
                            className={styles.resultContainer}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0 }}
                        >
                            {/* Section A: Question Context */}
                            <motion.div className={styles.section} variants={itemVariants}>
                                <div className={styles.sectionIconHeader}>
                                    <MessageSquare size={16} className={styles.accentIcon} />
                                    <h2 className={styles.sectionTitle}>The Query</h2>
                                </div>
                                <p className={styles.questionContext}>&quot;{result.questionContext}&quot;</p>
                            </motion.div>

                            {/* Section Verdict */}
                            <motion.div className={`${styles.section} ${styles.verdictSection}`} variants={itemVariants}>
                                <div className={styles.verdictHeader}>
                                    <div>
                                        <div className={styles.sectionIconHeader}>
                                            <Sparkles size={16} className={styles.accentIcon} />
                                            <h2 className={styles.sectionTitle}>Action Verdict</h2>
                                        </div>
                                    </div>
                                    <div className={`${styles.verdictBadge} ${styles[result.finalVerdict.toLowerCase()]}`}>
                                        {result.finalVerdict}
                                    </div>
                                </div>
                                <p className={styles.verdictSubtitle}>Celestial Decision Matrix Analysis:</p>
                                <ul className={styles.treeList}>
                                    {result.decisionTreeSteps.map((step, i) => (
                                        <li key={i} className={styles.treeStep}>{step}</li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Section B: Current Phase Overview */}
                            <motion.div className={`${styles.section} ${styles.phaseSection}`} variants={itemVariants}>
                                <h2 className={styles.sectionTitle}>Timing of the Soul</h2>
                                <p>{result.phaseOverview}</p>
                            </motion.div>

                            {/* Section C: Pattern Insights */}
                            <motion.div className={styles.section} variants={itemVariants}>
                                <h2 className={styles.sectionTitle}>Forces at Play</h2>
                                <ul className={styles.insightList}>
                                    {result.patternInsights.map((insight: string, i: number) => (
                                        <li key={i}>{insight}</li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Section D: Action Guidance */}
                            <motion.div className={`${styles.section} ${styles.guidanceSection}`} variants={itemVariants}>
                                <h2 className={styles.sectionTitle}>Path to Awareness</h2>
                                <ul className={styles.actionList}>
                                    {result.actionGuidance.map((action: string, i: number) => (
                                        <li key={i}>{action}</li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Section E: Reflective Questions */}
                            <motion.div className={styles.section} variants={itemVariants}>
                                <h2 className={styles.sectionTitle}>Contemplations</h2>
                                <ul className={styles.reflectionList}>
                                    {result.reflectiveQuestions.map((q: string, i: number) => (
                                        <li key={i}>{q}</li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Free-will closing line (8.3) */}
                            <motion.p className={styles.freeWillClosing} variants={itemVariants}>
                                {result.ethicalClosing || 'This is the energy at play. What you do with it is entirely yours.'}
                            </motion.p>

                            {/* Save / Share actions */}
                            <motion.div className={styles.responseActions} variants={itemVariants}>
                                <button
                                    onClick={handleSaveResponse}
                                    className={styles.responseActionBtn}
                                    disabled={saving}
                                >
                                    {saveMsg ? (
                                        <>{saveMsg}</>
                                    ) : saved ? (
                                        <><Check size={16} /> Saved</>
                                    ) : saving ? (
                                        <><Bookmark size={16} /> Saving…</>
                                    ) : (
                                        <><Bookmark size={16} /> Save this response</>
                                    )}
                                </button>
                                <button onClick={handleShareResponse} className={styles.responseActionBtn}>
                                    {shareMsg ? <><Check size={16} /> {shareMsg}</> : <><Share2 size={16} /> Share this insight</>}
                                </button>
                                <button onClick={handleDownloadResponse} className={styles.responseActionBtn} disabled={isDownloading}>
                                    {isDownloading ? 'Generating...' : <><Download size={16} /> Download PDF</>}
                                </button>
                            </motion.div>

                            <motion.button
                                onClick={() => { setResult(null); setQuestion(''); }}
                                className={styles.resetBtn}
                                variants={itemVariants}
                            >
                                Ask Another Question
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.form 
                    onSubmit={handleAsk} 
                    className={styles.inputContainer}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                >
                    <textarea
                        className={styles.questionInput}
                        placeholder={result ? "Ask another question..." : "What do you seek to understand?"}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={isAnalyzing}
                    />
                    <button
                        type="submit"
                        className={styles.askBtn}
                        disabled={isAnalyzing || !question.trim() || question.length < 10}
                        aria-label="Send question"
                    >
                        {isAnalyzing ? <div className={styles.loaderSmall}></div> : <Send size={20} />}
                    </button>
                    {isAnalyzing && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginTop: '-8px', textAlign: 'center' }}>
                            Seeking clarity...
                        </p>
                    )}
                </motion.form>
                
                {/* Character/Focus guide */}
                <div className={styles.characterGuide}>
                    Best questions are <strong>specific and reflective</strong>.<br />
                    Try: <em>&ldquo;Why do I keep pulling away when relationships get serious?&rdquo;</em> Instead of: <em>&ldquo;Will I get married?&rdquo;</em>
                </div>

                {/* Disclaimer footnote (12.1) */}
                <div className={styles.disclaimerNote}>
                    <ShieldCheck size={14} />
                    <span>
                        Chetna is for awareness and reflection, not prediction.{' '}
                        <Link href="/disclaimer">Read our approach.</Link>
                    </span>
                </div>
            </div>
        </ProfileGuard>
    );
}
