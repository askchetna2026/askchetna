'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserPlus } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import styles from './FloatingActionButton.module.css';
import { useRouter, usePathname } from 'next/navigation';

export default function FloatingActionButton() {
    const { data: session } = useSession();
    const { openNewProfileModal, profileData } = useProfile();

    const pathname = usePathname();

    const handleClick = () => {
        openNewProfileModal();
    };

    if (!session) return null;

    // Do not show the new profile button in active chat flows where it blocks the UI
    if (pathname && (pathname.startsWith('/consult') || pathname.startsWith('/clarity'))) {
        return null;
    }

    return (
        <>
            <button
                // Hook for globals.css — see AppScreenChrome.
                className={`app-floating-chrome ${styles.fab}`}
                onClick={handleClick}
                title={profileData?.canAddMore ? 'Create new profile' : 'Profile limit reached'}
            >
                <UserPlus size={24} />
            </button>
        </>
    );
}
