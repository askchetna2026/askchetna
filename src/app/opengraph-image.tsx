import { ImageResponse } from 'next/og';

export const alt = 'AskChetna - Astrology for Awareness, Not Prediction';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
                <div style={{ fontSize: 40, letterSpacing: 8, color: '#d4af37', display: 'flex' }}>
                    ASKCHETNA
                </div>
                <div style={{ fontSize: 72, fontWeight: 700, marginTop: 32, lineHeight: 1.15, display: 'flex' }}>
                    Astrology for Awareness
                </div>
                <div style={{ fontSize: 40, color: '#9aa0c7', marginTop: 16, display: 'flex' }}>
                    Understand patterns, not predictions
                </div>
                <div
                    style={{
                        marginTop: 56,
                        fontSize: 28,
                        color: '#d4af37',
                        borderTop: '1px solid rgba(212,175,55,0.4)',
                        paddingTop: 24,
                        letterSpacing: 4,
                        display: 'flex',
                    }}
                >
                    askchetna.com
                </div>
            </div>
        ),
        { ...size }
    );
}
