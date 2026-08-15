'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import styles from './JournalWidget.module.css';

type JournalPreview = { id: string; date: string; content: string };

export default function JournalWidget() {
    const { data: session } = useSession();
    const today = new Date().toISOString().split('T')[0];
    const [localEntries, setLocalEntries] = useLocalStorage<Record<string, string>>('chetna_journal', {});
    const [currentEntry, setCurrentEntry] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const fetchEntryFromDB = useCallback(async () => {
        try {
            const res = await fetch(`/api/journal?date=${today}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentEntry(data.content || '');
                setIsSaved(true);
            }
        } catch (err) {
            console.error('Failed to fetch from DB:', err);
        }
    }, [today]);

    // Load initial entry
    useEffect(() => {
        if (session) {
            fetchEntryFromDB();
        } else {
            if (localEntries[today]) {
                setCurrentEntry(localEntries[today]);
            }
        }
    }, [session, today, fetchEntryFromDB, localEntries]);

    const handleSave = async () => {
        setLoading(true);
        try {
            if (session) {
                const res = await fetch('/api/journal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: today,
                        content: currentEntry,
                    }),
                });
                if (res.ok) {
                    setIsSaved(true);
                }
            } else {
                setLocalEntries({
                    ...localEntries,
                    [today]: currentEntry
                });
                setIsSaved(true);
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setLoading(false);
            setTimeout(() => setIsSaved(false), 3000);
        }
    };

    const handleAnalyze = async () => {
        if (!currentEntry || currentEntry.length < 10) return;
        setAnalyzing(true);
        setAnalysis(null);
        try {
            const res = await fetch('/api/journal/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: today,
                    content: currentEntry,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setAnalysis(data);
            }
        } catch (err) {
            console.error('Analysis failed:', err);
        } finally {
            setAnalyzing(false);
        }
    };

    const [showInfoModal, setShowInfoModal] = useState(false);
    // The composer opens as a single line and grows once the reader engages.
    // A full-height empty textarea was dominating the home page's best column
    // and reading as a broken panel rather than an invitation to write.
    const [composing, setComposing] = useState(false);
    const [recent, setRecent] = useState<JournalPreview[]>([]);

    useEffect(() => {
        if (!session) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/journal?limit=3');
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setRecent(data.entries || []);
            } catch (err) {
                console.error('Failed to fetch recent entries:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
        // Re-runs after a save so a new entry appears in the list below.
    }, [session, isSaved]);

    // Today's own entry is the one being edited above, so showing it again
    // underneath would read as a duplicate.
    const past = recent.filter((e) => e.date !== today && e.content.trim());
    const expanded = composing || currentEntry.length > 0;

    return (
        <div className={styles.widget}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className={styles.title}>Daily Journaling</h3>
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className={styles.infoLink}
                    >
                        What it does
                    </button>
                </div>
                <span className={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>

            <textarea
                className={`${styles.textarea} ${expanded ? styles.textareaOpen : ''}`}
                value={currentEntry}
                onFocus={() => setComposing(true)}
                onChange={(e) => {
                    setCurrentEntry(e.target.value);
                    setIsSaved(false);
                }}
                placeholder="How is today landing for you?"
            />

            {/* The controls only earn their space once there is something to
                save or analyse; before that they are two disabled buttons. */}
            {expanded && (
                <div className={styles.footer}>
                    <span className={styles.status}>
                        {isSaved ? 'Your reflection is saved' : 'You have unsaved thoughts'}
                    </span>
                    <div className={styles.btns}>
                        {session && (
                            <button
                                onClick={handleAnalyze}
                                className={styles.analyzeBtn}
                                disabled={analyzing || !currentEntry || currentEntry.length < 10}
                            >
                                {analyzing ? 'Analyzing...' : 'Analyze Patterns'}
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className={styles.saveBtn}
                            disabled={isSaved || loading}
                        >
                            {loading ? 'Saving...' : 'Save Reflection'}
                        </button>
                    </div>
                </div>
            )}

            {/* Earlier reflections, so the card carries a record of the reader's
                own patterns rather than an empty box. This is the "notice
                patterns over time" idea the product is built on, made visible. */}
            {past.length > 0 && (
                <div className={styles.recent}>
                    <span className={styles.recentLabel}>Earlier reflections</span>
                    {past.map((entry) => (
                        <Link
                            key={entry.id}
                            href="/journal"
                            className={styles.recentItem}
                        >
                            <span className={styles.recentDate}>
                                {new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                            <span className={styles.recentText}>{entry.content}</span>
                        </Link>
                    ))}
                    <Link href="/journal" className={styles.recentAll}>
                        Open journal →
                    </Link>
                </div>
            )}

            {analysis && (
                <div className={styles.analysisBox}>
                    <h4>Timing Insights</h4>
                    <div className={styles.insight}>
                        <span className={styles.insightLabel}>Correlation</span>
                        <p className={styles.insightText}>{analysis.correlation}</p>
                    </div>
                    <div className={styles.insight}>
                        <span className={styles.insightLabel}>Astrological Phase</span>
                        <p className={styles.insightText}>{analysis.astrologicalContext}</p>
                    </div>
                    <div className={styles.insight}>
                        <span className={styles.insightLabel}>Growth Guidance</span>
                        <p className={styles.insightText}>{analysis.growthSuggestion}</p>
                    </div>
                </div>
            )}

            {showInfoModal && typeof document !== 'undefined' && createPortal(
                <div className={styles.modalOverlay} onClick={() => setShowInfoModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowInfoModal(false)}
                        >
                            ×
                        </button>
                        <h4>Daily Journaling</h4>
                        <p>
                            Daily Reflection is a simple journaling space to note what you’re feeling, experiencing, or noticing each day. Write freely—events, emotions, reactions, or patterns you observe.
                        </p>
                        <p>
                            When you choose Analyze Patterns, your entry is reflected alongside your chart and current phase to highlight recurring themes and awareness cues. It doesn’t predict outcomes; it helps you notice patterns and respond more consciously.
                        </p>
                        <p>
                            Nothing is predicted. Everything is observed. Over weeks and months, you build a living record of your inner patterns-one that no prediction could ever replace.
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
