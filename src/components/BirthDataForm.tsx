'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { ChartData } from '@/lib/astrology/zodiac';
import { INDIAN_CITIES } from '@/lib/indianCities';
import ConfirmDialog from './ConfirmDialog';
import { useProfile } from '@/context/ProfileContext';
import styles from './BirthDataForm.module.css';

interface BirthDataFormProps {
    onChartGenerated?: (data: ChartData) => void;
    initialData?: UserProfile;
}

export type UserProfile = {
    id?: string;
    name: string;
    dateOfBirth: string | Date; // handle string from API or Form
    timeOfBirth: string;
    placeOfBirth: string;
    gender: string;
    latitude?: number;
    longitude?: number;
    chartData?: ChartData;
    unlockedCharts?: any[]; // Array of chart keys like ["D2", "D10"]
    createdAt?: string | Date;
    updatedAt?: string | Date;
};

export default function BirthDataForm({ onChartGenerated, initialData }: BirthDataFormProps) {
    const { data: session } = useSession();
    const { profileData } = useProfile();

    // Parse initial date if present
    const parseDate = (d: string | Date | undefined) => {
        if (!d) return '';
        if (d instanceof Date) return d.toISOString().split('T')[0];
        return String(d).split('T')[0];
    };

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        dob: parseDate(initialData?.dateOfBirth),
        tob: initialData?.timeOfBirth || '',
        pob: initialData?.placeOfBirth || '',
        gender: initialData?.gender || '',
        unknownTime: false
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                dob: parseDate(initialData.dateOfBirth),
                tob: initialData.timeOfBirth,
                pob: initialData.placeOfBirth,
                gender: initialData.gender || '',
                unknownTime: false
            });
        }
    }, [initialData]);


    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredCities, setFilteredCities] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Hydration fix for client-only logic
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

    // Outside click handler for autocomplete
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));

        // Filter cities for autocomplete when typing in pob field
        if (name === 'pob') {
            if (value.length >= 2) {
                const matches = INDIAN_CITIES.filter(city =>
                    city.toLowerCase().includes(value.toLowerCase())
                ).slice(0, 8); // Show max 8 suggestions
                setFilteredCities(matches);
                setShowSuggestions(matches.length > 0);
            } else {
                setShowSuggestions(false);
            }
        }
    };

    const selectCity = (city: string) => {
        setFormData(prev => ({ ...prev, pob: city }));
        setShowSuggestions(false);
        setFilteredCities([]);
    };

    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeProfile, setActiveProfile] = useState<any>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Fetch active profile on mount
    useEffect(() => {
        if (session?.user) {
            fetch('/api/profiles/active')
                .then(res => res.json())
                .then(data => {
                    if (data && data.profiles && data.profiles.length > 0) {
                        setActiveProfile(data.profiles[0]);
                    } else {
                        setActiveProfile(null);
                    }
                })
                .catch(err => console.error('Failed to fetch active profile:', err));
        }
    }, [session]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (formData.name.trim().length < 3) {
            setStatusMsg({ type: 'error', text: 'Name must be at least 3 characters long.' });
            return;
        }

        if (formData.pob.trim().length < 3) {
            setStatusMsg({ type: 'error', text: 'Location must be at least 3 characters long.' });
            return;
        }

        // Show confirmation dialog first
        setShowConfirmDialog(true);
    };

    const saveProfile = async () => {
        setLoading(true);
        setStatusMsg(null);
        setShowConfirmDialog(false);

        try {
            // 1. Geocode the Place of Birth
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.pob)}&limit=1`);
            const geoData = await geoRes.json();

            if (!geoData || geoData.length === 0) {
                throw new Error("Could not find coordinates for this location. Please try a major city.");
            }

            const lat = parseFloat(geoData[0].lat);
            const lng = parseFloat(geoData[0].lon);

            // 2. Parse Date and Time
            // Robust parsing: Split string to avoid timezone shifts (e.g. 2023-05-15 becomes May 14 in some TZs)
            const [year, month, day] = formData.dob.split('-').map(Number);
            const [hours, minutes] = formData.tob.split(':').map(Number);
            const hasTime = !formData.unknownTime && formData.tob;

            // 3. Calculate Chart (API Call)
            const calcRes = await fetch('/api/astrology/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: year,
                    month: month,
                    day: day,
                    hour: hasTime ? hours : 12,
                    minute: hasTime ? minutes : 0,
                    lat,
                    lng
                }),
            });

            if (!calcRes.ok) {
                const errorData = await calcRes.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || "Failed to calculate chart.");
            }
            const chartResult = await calcRes.json();

            // 4. Save User Profile (Mandatory)
            if (session?.user) {
                // The chart is stored as it arrives. This used to trim the deep
                // dasha levels here, which fixed the size of the one key this
                // form knew about and missed the `transits` subtree that was
                // most of the payload. Depth is now decided where the chart is
                // built (DASHA_DEPTH_STORED), and the profile API strips
                // anything unstorable, so there is nothing left to patch up
                // client-side.
                const saveRes = await fetch('/api/profiles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        dateOfBirth: formData.dob,
                        timeOfBirth: formData.tob || "12:00",
                        placeOfBirth: formData.pob,
                        gender: formData.gender,
                        latitude: lat,
                        longitude: lng,
                        chartData: chartResult
                    }),
                });

                if (!saveRes.ok) throw new Error("Failed to save profile.");
                const savedProfile = await saveRes.json();
                setStatusMsg({ type: 'success', text: 'Profile saved successfully! Check your details in the Dashboard.' });

                if (onChartGenerated) {
                    onChartGenerated(savedProfile);
                }
            }

        } catch (err: unknown) {
            console.error('BirthDataForm Error:', err);
            const message = err instanceof Error ? err.message : String(err);
            setStatusMsg({ type: 'error', text: message });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOverwrite = () => {
        saveProfile();
    };

    const handleCancelOverwrite = () => {
        setShowConfirmDialog(false);
    };

    if (!isClient) return null;

    return (
        <div className={styles.formContainer}>
            <form onSubmit={handleSubmit} className={styles.formGrid}>

                {/* Name */}
                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="bdf-name">FULL NAME</label>
                    <input
                        id="bdf-name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        required
                        minLength={3}
                        className={styles.input}
                    />
                </div>

                {/* Gender */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>GENDER</label>
                    <div className={styles.genderOptions}>
                        {['male', 'female', 'other'].map((g) => (
                            <label key={g} className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value={g}
                                    checked={formData.gender === g}
                                    onChange={handleChange}
                                    required
                                />
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Date and Time Row */}
                <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="bdf-dob">DATE OF BIRTH</label>
                        <input
                            id="bdf-dob"
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="bdf-tob">TIME OF BIRTH</label>
                        <input
                            id="bdf-tob"
                            type="time"
                            name="tob"
                            value={formData.tob}
                            onChange={handleChange}
                            disabled={formData.unknownTime}
                            required={!formData.unknownTime}
                            className={styles.input}
                            style={{ opacity: formData.unknownTime ? 0.5 : 1 }}
                        />
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="unknownTime"
                                checked={formData.unknownTime}
                                onChange={handleChange}
                            />
                            I don&apos;t know my exact birth time
                        </label>
                    </div>
                </div>

                {/* Place of Birth */}
                <div className={styles.inputGroup} ref={wrapperRef}>
                    <label className={styles.label} htmlFor="bdf-pob">PLACE OF BIRTH</label>
                    <input
                        id="bdf-pob"
                        type="text"
                        name="pob"
                        value={formData.pob}
                        onChange={handleChange}
                        onFocus={() => formData.pob.length >= 2 && setShowSuggestions(true)}
                        placeholder="Start typing city..."
                        required
                        minLength={3}
                        autoComplete="off"
                        className={styles.input}
                    />

                    {/* Suggestions */}
                    {showSuggestions && filteredCities.length > 0 && (
                        <div className={styles.suggestions}>
                            {filteredCities.map((city, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => selectCity(city)}
                                    className={styles.suggestionItem}
                                >
                                    {city}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Messages */}
                {statusMsg && (
                    <div className={`${styles.message} ${statusMsg.type === 'success' ? styles.success : styles.error}`}>
                        {statusMsg.text}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitBtn}
                >
                    {loading ? 'CALCULATING COSMIC MAP...' : (initialData ? 'SAVE NEW PROFILE' : 'BEGIN JOURNEY')}
                </button>
                
                {/* Privacy Reassurance */}
                <div className={styles.privacyReassurance}>
                    Your birth data is used only to calculate your chart. We never sell or share it.{' '}
                    <a href="/privacy">Privacy Policy</a> · <a href="/how-we-calculate">How we calculate your chart</a>
                </div>
            </form>

            <ConfirmDialog
                isOpen={showConfirmDialog}
                title="Save Profile Configuration?"
                message={`Please revalidate your input details. Once saved, these details are used for all future astrological checks.
                
Name: ${formData.name}
DOB: ${formData.dob}
TOB: ${formData.tob || (formData.unknownTime ? 'Unknown' : '12:00')}
Gender: ${formData.gender}
Place: ${formData.pob}

${activeProfile && profileData && !profileData.canAddMore ? `Saving this will deactivate your oldest active profile ("${activeProfile.name}") as you have reached your limit.` : ''}

Are you sure you want to proceed?`}
                confirmText="Yes, Save Profile"
                cancelText="Check Again"
                onConfirm={handleConfirmOverwrite}
                onCancel={handleCancelOverwrite}
                variant="warning"
            />
        </div>
    );
}
