'use client';

import { useProfile } from '@/context/ProfileContext';
import { UserProfile } from './BirthDataForm';
import { PlusCircle, User } from 'lucide-react';
import styles from './ProfileSelector.module.css';

interface ProfileSelectorProps {
    onSelect: (profile: UserProfile) => void;
    /**
     * Profile id to leave out of the list.
     *
     * Synastry compares two charts, and offering the same person in both slots
     * let you compare a chart with itself — which produces a confidently
     * meaningless reading rather than an error.
     */
    excludeId?: string | null;
}

export default function ProfileSelector({ onSelect, excludeId }: ProfileSelectorProps) {
    const { profileData, openNewProfileModal, loading } = useProfile();

    if (loading && !profileData) {
        return <div className={styles.loading}>Loading profiles...</div>;
    }

    // profileData comes from an untyped context; narrowing once here keeps the
    // `any` from spreading through every callback below.
    const all: UserProfile[] = profileData?.profiles ?? [];
    const profiles = excludeId ? all.filter((p) => p.id !== excludeId) : all;

    // Every profile they have is already taken by the other slot, so the only
    // way forward is a new one. Saying so beats showing an empty box.
    if (all.length > 0 && profiles.length === 0) {
        return (
            <div className={styles.container}>
                <p className={styles.emptyHint}>
                    Your other profiles are already selected. Add someone new to compare.
                </p>
                <button onClick={openNewProfileModal} className={styles.newBtn}>
                    <PlusCircle size={16} />
                    <span>Create New Profile</span>
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.list}>
                {profiles.map((profile) => (
                    <button
                        key={profile.id}
                        onClick={() => onSelect(profile)}
                        className={styles.profileBtn}
                    >
                        <User size={16} />
                        <span>{profile.name}</span>
                    </button>
                ))}
            </div>

            <button onClick={openNewProfileModal} className={styles.newBtn}>
                <PlusCircle size={16} />
                <span>Create New Profile</span>
            </button>
        </div>
    );
}
