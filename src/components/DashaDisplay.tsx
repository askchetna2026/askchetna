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

    const PLANET_NAMES: Record<string, string> = {
        SU: 'Sun',
        MO: 'Moon',
        MA: 'Mars',
        ME: 'Mercury',
        JU: 'Jupiter',
        VE: 'Venus',
        SA: 'Saturn',
        RA: 'Rahu',
        KE: 'Ketu'
    };

    const getPlanetName = (lord: string) => PLANET_NAMES[lord.toUpperCase()] || lord;

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
                            <span className="planet-name">{getPlanetName(dasha.lord)}</span>
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
                                            <span className="ad-lord">{getPlanetName(ad.lord)}</span>
                                            <span className="ad-dates">{formatDate(ad.start)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="ad-mini">Includes 9 sub-periods (Antardashas)</div>
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
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--card-border);
                    box-shadow: var(--shadow-card);
                }

                .section-title {
                    color: var(--primary);
                    font-family: var(--font-heading);
                    font-size: clamp(1.4rem, 5vw, 2.2rem);
                    text-align: center;
                    margin-bottom: 8px;
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
                    background: var(--card-bg);
                    border: 1px solid var(--card-border);
                    padding: 16px;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                    position: relative;
                    box-shadow: var(--shadow-raise);
                }

                .dasha-card:hover {
                    border-color: var(--accent-gold-decor);
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-float);
                }

                .dasha-card.current {
                    background: rgba(var(--accent-gold-rgb), 0.05);
                    border: 1px solid var(--accent-gold);
                    box-shadow: var(--shadow-card);
                }

                /* NATIVE APP OVERRIDES (Vertical Timeline & Touch Feel) */
                :global(.native-app) .timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    padding-left: 28px;
                }

                :global(.native-app) .timeline::before {
                    content: '';
                    position: absolute;
                    left: 7px;
                    top: 24px;
                    bottom: 24px;
                    width: 2px;
                    background: var(--border-soft);
                    border-radius: 2px;
                }

                :global(.native-app) .dasha-card {
                    border-radius: 16px;
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
                    user-select: none;
                    -webkit-user-select: none;
                }

                :global(.native-app) .dasha-card:hover {
                    transform: none; /* Disable web hover lift in app */
                }

                :global(.native-app) .dasha-card:active {
                    transform: scale(0.98);
                }

                :global(.native-app) .dasha-card::before {
                    content: '';
                    position: absolute;
                    left: -25px;
                    top: 22px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--card-bg);
                    border: 2px solid var(--accent-gold);
                    z-index: 1;
                }

                :global(.native-app) .dasha-card.current::before {
                    background: var(--accent-gold);
                    box-shadow: 0 0 0 4px rgba(var(--accent-gold-rgb), 0.2);
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
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .current-badge {
                    background: var(--accent-gold);
                    color: var(--bg-panel);
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
                    border-top: 1px solid var(--border-soft);
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
                    background: rgba(139, 94, 16, 0.05);
                }

                .ad-current {
                    background: rgba(var(--accent-gold-rgb), 0.1);
                    border: 1px solid var(--accent-gold-decor);
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
