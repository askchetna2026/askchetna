'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { buildPricingUrl } from '@/lib/monetization';

interface ProfileContextType {
    isDrawerOpen: boolean;
    isLimitModalOpen: boolean;
    profileData: any;
    loading: boolean;
    openNewProfileModal: () => Promise<void>;
    closeDrawer: () => void;
    closeLimitModal: () => void;
    refreshProfileData: () => Promise<void>;
    handleUpgrade: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchProfileData = async () => {
        try {
            const res = await fetch('/api/profiles/active', { cache: 'no-store' });
            const data = await res.json();
            if (!data.error) {
                setProfileData(data);
                return data;
            }
        } catch (error) {
            console.error('Failed to fetch profile data:', error);
        }
        return null;
    };

    const openNewProfileModal = async () => {
        setLoading(true);
        const data = await fetchProfileData();
        setLoading(false);

        if (data && data.canAddMore) {
            setIsDrawerOpen(true);
        } else {
            setIsLimitModalOpen(true);
        }
    };

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/profiles/expand-limit', {
                method: 'POST',
            });

            if (res.ok) {
                await fetchProfileData();
                setIsLimitModalOpen(false);
                setIsDrawerOpen(true);
            } else {
                const data = await res.json();
                if (res.status === 402 && typeof window !== 'undefined') {
                    const returnUrl = new URL(window.location.href);
                    returnUrl.searchParams.delete('purchase');
                    returnUrl.searchParams.delete('purchaseIntent');

                    window.location.assign(buildPricingUrl({
                        intent: 'profile_expansion',
                        source: 'profile_limit_blocked',
                        returnTo: `${returnUrl.pathname}${returnUrl.search}`,
                    }));
                    return;
                }
                alert(data.error || 'Failed to expand limit');
            }
        } catch (error) {
            console.error('Expansion error:', error);
            alert('Failed to expand profile limit');
        } finally {
            setLoading(false);
        }
    };

    const closeDrawer = () => setIsDrawerOpen(false);
    const closeLimitModal = () => setIsLimitModalOpen(false);
    const refreshProfileData = async () => { await fetchProfileData(); };

    return (
        <ProfileContext.Provider value={{
            isDrawerOpen,
            isLimitModalOpen,
            profileData,
            loading,
            openNewProfileModal,
            closeDrawer,
            closeLimitModal,
            refreshProfileData,
            handleUpgrade
        }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
}
