'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import { getProfiles } from '@/lib/profileStore';
import styles from './ProfileGuard.module.css';

interface ProfileGuardProps {
    children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [hasActiveProfile, setHasActiveProfile] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/dashboard');
            return;
        }

        if (status === 'authenticated') {
            checkActiveProfile();
        }
    }, [status, router]);

    const checkActiveProfile = async () => {
        try {
            // Through the shared store: this gate wraps whole pages, so its
            // check used to be a second identical request racing whatever the
            // page itself was already asking for.
            const data = await getProfiles((fresh) => {
                setHasActiveProfile((fresh.profiles?.length ?? 0) > 0);
            });
            setHasActiveProfile((data?.profiles?.length ?? 0) > 0);
        } catch (error) {
            console.error('Failed to check active profile:', error);
            setHasActiveProfile(false);
        } finally {
            setLoading(false);
        }
    };

    const { openNewProfileModal } = useProfile();

    if (status === 'loading' || loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
                <p>Checking your profile...</p>
            </div>
        );
    }

    if (hasActiveProfile === false) {
        return (
            <div className={styles.guardContainer}>
                <div className={styles.promptCard}>
                    <div className={styles.icon}>⭐</div>
                    <h2 className={styles.title}>Profile Required</h2>
                    <p className={styles.message}>
                        To access this feature, you need to create your birth chart profile first.
                        This allows us to provide personalized insights based on your unique astrological data.
                    </p>
                    <button onClick={openNewProfileModal} className={styles.createButton}>
                        Create Your Profile
                    </button>
                    <Link href="/" className={styles.homeLink}>
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
