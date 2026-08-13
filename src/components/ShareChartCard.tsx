'use client';

import { useRef, useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { getZodiacSign } from '@/lib/astrology/zodiac';
import type { UserProfile } from '@/components/BirthDataForm';
import styles from './ShareChartCard.module.css';

const LORD_THEME: Record<string, string> = {
    Jupiter: 'Growth', Saturn: 'Discipline', Mercury: 'Learning', Venus: 'Relationships',
    Sun: 'Identity', Moon: 'Emotion', Mars: 'Action', Rahu: 'Ambition', Ketu: 'Release',
};

interface ShareChartShape {
    ascendant?: number;
    planets?: Record<string, { longitude: number }>;
    dashas?: { lord: string; isCurrent?: boolean }[];
}

export default function ShareChartCard({ profile }: { profile: UserProfile }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState(false);

    const chart = profile.chartData as ShareChartShape | undefined;
    if (!chart?.ascendant || !chart?.planets?.Moon || !chart?.planets?.Sun) return null;

    const ascSign = getZodiacSign(chart.ascendant);
    const moonSign = getZodiacSign(chart.planets.Moon.longitude);
    const sunSign = getZodiacSign(chart.planets.Sun.longitude);
    const currentDasha = Array.isArray(chart.dashas) ? chart.dashas.find((d) => d.isCurrent) : null;
    const dashaTheme = currentDasha ? (LORD_THEME[currentDasha.lord] || currentDasha.lord) : null;

    const threeLineText =
        `I'm a ${moonSign} Moon, ${ascSign} Rising` +
        (dashaTheme ? `, currently in a ${dashaTheme} phase.` : '.') +
        ` Explore yours at askchetna.com`;

    const handleShare = async () => {
        if (!cardRef.current) return;
        setBusy(true);
        try {
            const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true });
            const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Could not generate image');

            const { shareContent } = await import('@/lib/native/share');
            const { successFeedback } = await import('@/lib/native/haptics');

            // Routes to the OS share sheet in the apps. Android's WebView has no
            // Web Share API, so before this the chart silently downloaded instead
            // of opening a share sheet — on the one platform where sharing a chart
            // image matters most.
            const outcome = await shareContent({
                title: 'My Chetna Chart',
                text: threeLineText,
                file: { blob, name: 'my-chetna-chart.png' },
            });

            if (outcome === 'shared') {
                void successFeedback();
            } else if (outcome === 'failed') {
                // Neither a share sheet nor the clipboard worked (desktop browsers
                // cannot put an image on the clipboard) — save the file instead.
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = 'my-chetna-chart.png';
                link.click();
            }
        } catch (err) {
            console.error('Share failed:', err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button onClick={handleShare} className={styles.shareBtn} disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                Share My Chart
            </button>

            {/* Off-screen branded card captured for the social image */}
            <div className={styles.cardStage} aria-hidden="true">
                <div className={styles.card} ref={cardRef}>
                    <div className={styles.brand}>✦ AskChetna</div>
                    <div className={styles.name}>{profile.name?.split(' ')[0] || 'Seeker'}</div>
                    <div className={styles.rows}>
                        <div className={styles.row}><span>Rising</span><strong>{ascSign}</strong></div>
                        <div className={styles.row}><span>Moon</span><strong>{moonSign}</strong></div>
                        <div className={styles.row}><span>Sun</span><strong>{sunSign}</strong></div>
                        {dashaTheme && <div className={styles.row}><span>Current Phase</span><strong>{dashaTheme}</strong></div>}
                    </div>
                    <div className={styles.tagline}>Awareness, not prediction</div>
                    <div className={styles.url}>askchetna.com</div>
                </div>
            </div>
        </>
    );
}
