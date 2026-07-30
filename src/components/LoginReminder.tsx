'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { LogIn, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LoginReminder.module.css';

export default function LoginReminder() {
    const { status } = useSession();
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [bonusCredits, setBonusCredits] = useState<number | null>(null);

    // Rendered by the layout on every page, so the amount cannot be passed down
    // from a server component the way WelcomeBanner's is. Fetched only once the
    // reminder is actually going to be shown — this component sits on every
    // route and most visitors never see it.
    useEffect(() => {
        if (!isVisible || bonusCredits !== null) return;

        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch('/api/public/welcome-bonus', { cache: 'no-store' });
                const data = await res.json();
                if (!cancelled && typeof data?.bonusAmount === 'number') {
                    setBonusCredits(data.bonusAmount);
                }
            } catch {
                // Leave it null: the list item drops the count rather than
                // showing a number that might be wrong.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isVisible, bonusCredits]);

    useEffect(() => {
        // Only show if unauthenticated, not on login page, 
        // and hasn't been dismissed in this session
        const isDismissed = sessionStorage.getItem('login-reminder-dismissed');

        if (status === 'unauthenticated' && pathname !== '/login' && !isDismissed) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000); // Show after 3 seconds
            return () => clearTimeout(timer);
        } else if (isVisible) {
            requestAnimationFrame(() => setIsVisible(false));
        }
    }, [status, pathname, isVisible]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('login-reminder-dismissed', 'true');
    };

    const handleLogin = () => {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(pathname)}`;
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className={styles.reminder}
                >
                    <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss">

                        <X size={16} />
                    </button>

                    <div className={styles.content}>
                        <div className={styles.iconWrapper}>
                            <Sparkles size={20} />
                        </div>
                        <div className={styles.textGroup}>
                            <h4 className={styles.title}>Sign up free to unlock</h4>
                            <ul className={styles.unlockList}>
                                <li>Full birth chart</li>
                                <li>Dasha timing</li>
                                <li>
                                    {bonusCredits === null
                                        ? 'AI questions (free to start)'
                                        : `AI questions (${bonusCredits} free)`}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <button className={styles.loginBtn} onClick={handleLogin}>
                        <LogIn size={18} />
                        Sign In Now
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
