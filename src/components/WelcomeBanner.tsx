'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

/**
 * `bonusAmount` is resolved by the root layout, which already reads the setting
 * server-side. This component used to ignore that and re-fetch the same number
 * from /api/public/welcome-bonus on mount, which bought nothing and cost a
 * round trip — and until it landed the banner read "Sign up now to get free
 * credits", so the offer arrived a beat after the rest of the page.
 */
export default function WelcomeBanner({ bonusAmount }: { bonusAmount: number }) {
    const { status } = useSession();
    const [isVisible, setIsVisible] = useState(true);

    if (status === 'authenticated' || !isVisible) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                // Hook for globals.css — the app's home screens hide the floating
                // chrome and this banner. See AppScreenChrome.
                className="app-floating-chrome"
                style={{
                    width: '100%',
                    background: 'linear-gradient(to right, var(--bg-primary), var(--bg-panel))',
                    borderBottom: '1px solid var(--accent-gold)',
                    position: 'relative',
                    zIndex: 50
                }}
            >
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                }}>
                    <Sparkles size={18} color="var(--accent-gold)" />
                    <span style={{
                        color: 'var(--foreground)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        textAlign: 'center'
                    }}>
                        Unlock your spiritual journey!
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginLeft: '6px' }}>
                            {`Sign up now to get ${bonusAmount} free credit${bonusAmount === 1 ? '' : 's'}.`}
                        </span>
                    </span>
                    <Link
                        href="/login"
                        style={{
                            // The one button colour. This was a gold fill, which
                            // made it the odd control out on every screen it
                            // appeared on — and gold is now dark enough to read
                            // as text on parchment, so it was drifting toward
                            // unreadable as a fill too.
                            background: 'var(--btn-bg)',
                            color: 'var(--btn-fg)',
                            padding: '6px 16px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Claim Credits
                    </Link>

                    <button
                        onClick={() => setIsVisible(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            position: 'absolute',
                            right: '16px'
                        }}
                        aria-label="Close banner"
                    >
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
