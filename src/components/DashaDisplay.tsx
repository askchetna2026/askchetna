import React from 'react';
import DashaStory from './DashaStory';

interface DashaPeriod {
    lord: string;
    start: string;
    end: string;
    isCurrent: boolean;
    antardashas?: Array<{
        lord: string;
        start: string;
        end: string;
        isCurrent: boolean;
        pratyantarDashas?: Array<{
            lord: string;
            start: string;
            end: string;
            isCurrent: boolean;
            sookshmaDashas?: Array<{
                lord: string;
                start: string;
                end: string;
                isCurrent: boolean;
                pranaDashas?: Array<{
                    lord: string;
                    start: string;
                    end: string;
                    isCurrent: boolean;
                }>;
            }>;
        }>;
    }>;
}

interface DashaDisplayProps {
    dashas?: DashaPeriod[];
}

export default function DashaDisplay({ dashas }: DashaDisplayProps) {
    if (!dashas || dashas.length === 0) return null;

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="dasha-container">
            <DashaStory dashas={dashas} />

            <div style={{ marginTop: '64px', borderTop: '1px dashed var(--card-border)', paddingTop: '64px' }}>
                <h3 className="section-title">Technical Timeline</h3>
                <p className="subtitle">Vimsottari Dasha detail view</p>
            </div>

            <div className="timeline">
                {dashas.map((dasha, idx) => (
                    <div
                        key={idx}
                        className={`dasha-card ${dasha.isCurrent ? 'current' : ''}`}
                    >
                        <div className="dasha-header">
                            <span className="planet-name">{dasha.lord}</span>
                            {dasha.isCurrent && <span className="current-badge">Running Now</span>}
                        </div>
                        <div className="dasha-dates">
                            {formatDate(dasha.start)} — {formatDate(dasha.end)}
                        </div>

                        {dasha.antardashas && dasha.antardashas.length > 0 && (
                            <div className="antardasha-list">
                                {dasha.isCurrent ? (
                                    dasha.antardashas.map((ad, adIdx) => (
                                        <div key={adIdx} className={`antardasha-item ${ad.isCurrent ? 'ad-current' : ''}`}>
                                            <span className="ad-lord">{ad.lord}</span>
                                            <span className="ad-dates">{formatDate(ad.start)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="ad-mini">Includes 9 sub-periods</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .dasha-container {
                    margin-top: 40px;
                    padding: clamp(24px, 4vw, 40px);
                    background: linear-gradient(180deg, rgba(22, 11, 32, 0.85) 0%, rgba(11, 5, 16, 0.95) 100%);
                    border-radius: var(--radius-lg);
                    border: 1px solid rgba(181, 137, 46, 0.3);
                    box-shadow: inset 0 1px 0 rgba(181, 137, 46, 0.4), 0 20px 50px rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                }

                .section-title {
                    color: var(--accent-gold);
                    font-family: var(--font-heading);
                    font-size: clamp(1.4rem, 5vw, 2.2rem);
                    text-align: center;
                    margin-bottom: 8px;
                    text-shadow: 0 0 15px rgba(181, 137, 46, 0.2);
                }

                .subtitle {
                    text-align: center;
                    color: var(--secondary);
                    font-size: 1.05rem;
                    margin-bottom: 32px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                .timeline {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(max(280px, 100%), 1fr));
                    gap: 20px;
                }

                @media (min-width: 640px) {
                    .timeline {
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    }
                }

                .dasha-card {
                    background: rgba(11, 5, 16, 0.6);
                    border: 1px solid rgba(181, 137, 46, 0.2);
                    padding: 20px;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    box-shadow: inset 0 1px 0 rgba(181, 137, 46, 0.1);
                }

                .dasha-card:hover {
                    background: linear-gradient(180deg, rgba(30, 15, 45, 0.8) 0%, rgba(15, 8, 22, 0.95) 100%);
                    border-color: rgba(181, 137, 46, 0.5);
                    transform: translateY(-4px);
                    box-shadow: inset 0 1px 0 rgba(181, 137, 46, 0.6), 0 10px 20px rgba(181, 137, 46, 0.1);
                }

                .dasha-card.current {
                    background: linear-gradient(180deg, rgba(181, 137, 46, 0.1) 0%, rgba(11, 5, 16, 0.8) 100%);
                    border: 1px solid var(--accent-gold);
                    box-shadow: inset 0 1px 0 rgba(181, 137, 46, 0.8), 0 4px 15px rgba(181, 137, 46, 0.2);
                }

                .dasha-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .planet-name {
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: var(--accent-gold);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .current-badge {
                    background: var(--accent-gold);
                    color: #fff;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 50px;
                }

                .dasha-dates {
                    font-size: 0.9rem;
                    color: var(--foreground);
                    opacity: 0.9;
                    font-family: monospace; /* Gives a technical chart feel */
                    margin-bottom: 12px;
                }

                .antardasha-list {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .antardasha-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.8rem;
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.02);
                }

                .ad-current {
                    background: rgba(181, 137, 46, 0.2);
                    border: 1px solid rgba(181, 137, 46, 0.3);
                    color: var(--accent-gold);
                    font-weight: 700;
                }

                .ad-dates {
                    opacity: 0.7;
                    font-size: 0.75rem;
                }

                .ad-mini {
                    font-size: 0.75rem;
                    color: var(--secondary);
                    font-style: italic;
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}
