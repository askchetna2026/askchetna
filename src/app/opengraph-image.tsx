import { ImageResponse } from 'next/og';

export const alt = 'AskChetna - Astrology for Awareness, Not Prediction';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The zodiac-ring emblem (open ring forming a "C", house dots, central sparkle).
// Inlined as an SVG data URI so Satori rasterizes it reliably inside <img>.
const EMBLEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="124" height="124" viewBox="0 0 124 124"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5D87A"/><stop offset="1" stop-color="#C49A2B"/></linearGradient></defs><path d="M100.3,94.15 A50 50 0 1 1 100.3,29.85" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/><circle cx="62" cy="112" r="2.4" fill="url(#g)"/><circle cx="26.64" cy="97.36" r="2.4" fill="url(#g)"/><circle cx="12" cy="62" r="2.4" fill="url(#g)"/><circle cx="26.64" cy="26.64" r="2.4" fill="url(#g)"/><circle cx="62" cy="12" r="2.4" fill="url(#g)"/><path d="M62,50 Q63.8,60.2 74,62 Q63.8,63.8 62,74 Q60.2,63.8 50,62 Q60.2,60.2 62,50 Z" fill="url(#g)"/></svg>`;

const EMBLEM_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(EMBLEM_SVG)}`;

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(150deg, #1a1430 0%, #0b0f2f 100%)',
                    color: '#f5f1e6',
                    fontFamily: 'serif',
                    padding: 80,
                    textAlign: 'center',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={EMBLEM_DATA_URI} width={150} height={150} alt="" style={{ display: 'flex' }} />

                <div style={{ display: 'flex', marginTop: 28, fontSize: 88, fontWeight: 700, lineHeight: 1 }}>
                    <span style={{ color: '#dfe0ff' }}>Ask</span>
                    <span style={{ color: '#d4af37' }}>Chetna</span>
                </div>

                <div style={{ display: 'flex', fontSize: 34, letterSpacing: 8, color: '#d4af37', marginTop: 22 }}>
                    ASTROLOGY FOR AWARENESS
                </div>

                <div style={{ display: 'flex', fontSize: 36, color: '#9aa0c7', marginTop: 18 }}>
                    Understand patterns, not predictions
                </div>

                <div
                    style={{
                        display: 'flex',
                        marginTop: 48,
                        fontSize: 26,
                        color: '#d4af37',
                        borderTop: '1px solid rgba(212,175,55,0.4)',
                        paddingTop: 22,
                        letterSpacing: 4,
                    }}
                >
                    askchetna.com
                </div>
            </div>
        ),
        { ...size }
    );
}
