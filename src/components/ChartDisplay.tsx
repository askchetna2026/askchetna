"use client";
import { describeHouse } from '@/lib/astrology/dashaContext';
import { SIGN_LORDS } from '@/lib/astrology/interpretations';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface PlanetPosition {
    name: string;
    longitude: number;
    latitude: number;
    distance: number;
    speed: number;
    isRetrograde: boolean;
    house?: number;
    navamsaSign?: string;
    dignity?: string;
}

interface ChartDisplayProps {
    data?: {
        planets: Record<string, PlanetPosition>;
        houses: number[];
        ascendant: number;
        navamsaAscendant?: string; // Legacy
    };
    isMoonChart?: boolean;
    width?: number | string;
    height?: number | string;
    language?: 'en' | 'hi';
}

const PLANET_HINDI: Record<string, string> = {
    'Sun': 'सू',
    'Moon': 'चं',
    'Mars': 'मं',
    'Mercury': 'बु',
    'Jupiter': 'गु',
    'Venus': 'शु',
    'Saturn': 'श',
    'Rahu': 'रा',
    'Ketu': 'के',
    'Ascendant': 'ल'
};

const HOUSE_THEMES: Record<number, { title: string, theme: string, awareness: string }> = {
    1: {
        title: '1st House: Self & Vitality',
        theme: 'This house represents your core identity, physical appearance, vitality, and the initial impression you make on the world. It is the lens through which you view all of life and how others first perceive you. The first house governs your body, temperament, and the natural energy you carry into every situation. A strong first house indicates robust health, confidence, and a clear sense of purpose, while challenges here may manifest as identity confusion or low vitality.',
        awareness: 'Are you truly expressing your authentic self, or are you wearing masks to please others? Consider whether your outer presentation aligns with your inner truth and values.'
    },
    2: {
        title: '2nd House: Values & Resource',
        theme: 'This house governs your relationship with material resources, personal values, speech, family wealth, and what you consider truly valuable in life. It reflects how you earn, save, and spend money, as well as the quality of your communication. The second house also indicates your self-worth and the childhood conditioning around abundance. It reveals whether you feel inherently deserving of prosperity or carry limiting beliefs about money and security.',
        awareness: 'What truly nourishes your sense of stability and security? Reflect on whether your pursuit of wealth is aligned with your deeper values or driven by fear and external expectations.'
    },
    3: {
        title: '3rd House: Skill & Courage',
        theme: 'This house represents your courage, communication skills, short journeys, siblings, neighbors, and all forms of self-initiated effort. It is the domain of your hands—your ability to create, write, perform, and take action. The third house reveals your mental curiosity, adaptability, and willingness to step outside your comfort zone. It also indicates the nature of your relationship with brothers, sisters, and your immediate community.',
        awareness: 'Are your actions driven by genuine curiosity and passion, or are you competing and comparing yourself with others? Consider whether you are taking risks from a place of courage or reacting from insecurity.'
    },
    4: {
        title: '4th House: Inner Peace',
        theme: 'This house governs your emotional foundation, relationship with your mother, your home environment, private life, and inner sense of security. It represents your roots, ancestry, land, property, and the place you retreat to for comfort. The fourth house is the deepest part of your chart, reflecting your subconscious mind and emotional well-being. A strong fourth house provides psychological stability, while challenges here can manifest as homelessness—external or internal.',
        awareness: 'Where do you find true refuge within yourself when the outer world becomes chaotic? Reflect on whether you are seeking peace externally or cultivating it from within your own heart.'
    },
    5: {
        title: '5th House: Creative Flow',
        theme: 'This house represents intelligence, creativity, children, romance, speculation, and all pursuits that bring spontaneous joy. It is the domain of your inner child, revealing how you play, create, and express your unique talents. The fifth house also governs progeny—both biological children and creative projects. It indicates whether you approach life with optimism and delight or whether duty has overshadowed your natural playfulness and inventive spirit.',
        awareness: 'Is your joy conditional on external outcomes, or is it a natural, unconditional state of being? Consider whether you are allowing yourself to create freely without judgment or attachment to results.'
    },
    6: {
        title: '6th House: Service & Health',
        theme: 'This house governs daily routines, health, work, service, employees, debts, enemies, and obstacles. It reveals how you manage challenges, serve others, and maintain your physical well-being. The sixth house is where we confront our limitations and learn the discipline required to overcome adversity. It shows your relationship with illness, conflict, and competition, as well as your capacity to turn obstacles into opportunities for growth through dedicated effort.',
        awareness: 'Are you consciously managing your difficulties and transmuting them into wisdom, or are you avoiding and suppressing them? Reflect on whether your daily habits support your health or undermine it.'
    },
    7: {
        title: '7th House: Partnership',
        theme: 'This house represents marriage, business partnerships, contracts, open enemies, and your relationship with the "Other." It is the mirror that reflects back the qualities you project onto others. The seventh house reveals the characteristics you seek in a life partner and the dynamics of all one-on-one relationships. It also governs legal agreements and public interactions. A balanced seventh house fosters mutual respect, while imbalances can lead to codependency or conflict.',
        awareness: 'Do you see others as they truly are, or are you projecting your own desires and fears onto them? Consider whether you are seeking completion in another person or honoring their independent existence.'
    },
    8: {
        title: '8th House: Transformation',
        theme: 'This house governs longevity, transformation, sudden events, inheritance, shared resources, occult knowledge, and the mysteries of life and death. It is the realm of deep psychological change, where we confront our shadows and emerge reborn. The eighth house reveals your capacity for intimacy, trust, and surrender. It also indicates financial gains through others—such as insurance, loans, or inheritances—and your relationship with the unknown and the unseen dimensions of reality.',
        awareness: 'What are you resisting letting go of that is preventing your transformation and growth? Reflect on whether you are controlling outcomes out of fear or surrendering to the natural flow of life.'
    },
    9: {
        title: '9th House: Higher Wisdom',
        theme: 'This house represents dharma, higher education, philosophy, religion, long-distance travel, teachers, and your father. It is the domain of your belief systems and your search for ultimate truth. The ninth house reveals how you expand your worldview, connect with the divine, and seek meaning beyond the material. It indicates your moral compass, spiritual practices, and the wisdom traditions that resonate with your soul. A strong ninth house brings grace, optimism, and the guidance of mentors.',
        awareness: 'Whose truths are you living by—your own or those inherited from family and culture? Consider whether your beliefs serve your evolution or limit your perception of reality.'
    },
    10: {
        title: '10th House: Action & Impact',
        theme: 'This house governs career, public reputation, authority, status, and your contributions to society. It represents the zenith of your chart—your highest potential achievement in the external world. The tenth house reveals how you are seen by the public, your relationship with power, and the legacy you leave behind. It also indicates your karma through action (Karma Yoga) and the quality of your professional reputation. A strong tenth house brings recognition and respect.',
        awareness: 'Does your work in the world reflect your deepest integrity and values, or are you pursuing status for external validation? Reflect on whether your career serves your soul\'s purpose or merely your ego.'
    },
    11: {
        title: '11th House: Social Gains',
        theme: 'This house represents friendships, social networks, aspirations, gains, income from career, elder siblings, and the fulfillment of desires. It is the domain of your hopes, dreams, and your contribution to collective causes. The eleventh house reveals the quality of your friendships and your capacity to work within groups for shared goals. It also indicates financial windfalls and the realization of long-term ambitions. A strong eleventh house brings abundance and supportive community.',
        awareness: 'Are you genuinely contributing to the collective well-being, or are you merely consuming from the network without giving back? Consider whether your desires are aligned with the greater good.'
    },
    12: {
        title: '12th House: Release',
        theme: 'This house governs loss, liberation, isolation, foreign lands, spirituality, the subconscious mind, hidden enemies, expenses, and moksha (spiritual liberation). It is the realm of surrender, where we release attachments and dissolve the ego. The twelfth house reveals your capacity for meditation, solitude, and transcendence. It also indicates expenses, confinement, and the need for retreat from worldly life. A balanced twelfth house brings spiritual wisdom and compassionate service.',
        awareness: 'What is asking to be surrendered for your ultimate peace and liberation? Reflect on whether you are clinging to the material world or allowing yourself to merge with the infinite mystery.'
    },
};

export default function ChartDisplay({ data, isMoonChart, width = '100%', height = 'auto', language: propLanguage = 'en' }: ChartDisplayProps) {
    const [activeHouse, setActiveHouse] = useState<number | null>(null);

    /* Recomputed when the open house changes. Pure arithmetic over the stored
       chart — no request, no model call. */
    const houseContext = activeHouse ? describeHouse(data, activeHouse, SIGN_LORDS) : null;
    const [language, setLanguage] = useState<'en' | 'hi'>(propLanguage);

    const getPlanetLabel = (name: string) => {
        if (language === 'hi') return PLANET_HINDI[name] || name.substring(0, 2);
        return name.substring(0, 2);
    };

    const planets = data?.planets || {};
    const ascendant = data?.ascendant || 0;

    // Fixed Whole Sign logic: First house starts at 0 degree of the sign containing Ascendant
    const ascSignIdx = Math.floor(ascendant / 30);

    // Distribute Planets into houses
    const planetsInHouses: Record<number, { name: string, longitude?: number, isTransit: boolean }[]> = {};
    const houseDignities: Record<number, string[]> = {};

    Object.values(planets).forEach((p) => {
        const pSignIdx = Math.floor(p.longitude / 30);
        const houseIdx = (pSignIdx - ascSignIdx + 12) % 12;
        const houseNum = houseIdx + 1;

        if (!planetsInHouses[houseNum]) planetsInHouses[houseNum] = [];
        // Store full name for correct translation lookup later
        planetsInHouses[houseNum].push({ name: p.name, longitude: p.longitude, isTransit: false });

        if (p.dignity) {
            if (!houseDignities[houseNum]) houseDignities[houseNum] = [];
            houseDignities[houseNum].push(`${p.name}: ${p.dignity}`);
        }
    });

    const houses = [
        { num: 1, path: 'M 200,200 L 300,100 L 200,0 L 100,100 Z', textX: 200, textY: 100 },
        { num: 2, path: 'M 100,100 L 200,0 L 0,0 Z', textX: 100, textY: 33.3 },
        { num: 3, path: 'M 100,100 L 0,0 L 0,200 Z', textX: 33.3, textY: 100 },
        { num: 4, path: 'M 200,200 L 100,100 L 0,200 L 100,300 Z', textX: 100, textY: 200 },
        { num: 5, path: 'M 100,300 L 0,200 L 0,400 Z', textX: 33.3, textY: 300 },
        { num: 6, path: 'M 100,300 L 0,400 L 200,400 Z', textX: 100, textY: 366.6 },
        { num: 7, path: 'M 200,200 L 100,300 L 200,400 L 300,300 Z', textX: 200, textY: 300 },
        { num: 8, path: 'M 300,300 L 200,400 L 400,400 Z', textX: 300, textY: 366.6 },
        { num: 9, path: 'M 300,300 L 400,400 L 400,200 Z', textX: 366.6, textY: 300 },
        { num: 10, path: 'M 200,200 L 300,300 L 400,200 L 300,100 Z', textX: 300, textY: 200 },
        { num: 11, path: 'M 300,100 L 400,200 L 400,0 Z', textX: 366.6, textY: 100 },
        { num: 12, path: 'M 300,100 L 400,0 L 200,0 Z', textX: 300, textY: 33.3 },
    ];

    // Add Ascendant specifically to the first house
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!planetsInHouses[1]) planetsInHouses[1] = [];
    if (!planetsInHouses[1].some(p => p.name === 'Ascendant')) {
        planetsInHouses[1].unshift({ name: 'Ascendant', longitude: ascendant, isTransit: false });
    }

    const housePlanets = activeHouse ? planetsInHouses[activeHouse] || [] : [];

    const ModalOverlay = () => (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: 'rgba(0, 0, 0, 0.75)', // Deeper contrast for backdrop
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxSizing: 'border-box'
            }}
            onClick={() => setActiveHouse(null)}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '24px',
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.8)',
                    width: '100%',
                    maxWidth: '850px',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 32px',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-soft, rgba(255, 255, 255, 0.02))',
                    flexShrink: 0
                }}>
                    <div>
                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '4px' }}>
                            Cosmic House Analysis
                        </span>
                        <h4 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                            {activeHouse}. {HOUSE_THEMES[activeHouse!].title}
                        </h4>
                    </div>
                    <button
                        onClick={() => setActiveHouse(null)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '10px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--secondary)',
                            padding: 0
                        }}
                    >
                        <span style={{ fontSize: '22px', lineHeight: 1 }}>×</span>
                    </button>
                </div>

                {/* Body Content */}
                <div style={{
                    padding: '32px',
                    overflowY: 'auto',
                    flexGrow: 1,
                    scrollbarGutter: 'stable'
                }}>
                    <div className="modal-content-grid">
                        {/* Sidebar: Occupants */}
                        <div className="modal-sidebar">
                            <h5 style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px', opacity: 0.8 }}>
                                Celestial Occupants
                            </h5>
                            {housePlanets.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {housePlanets.map((p, i) => {
                                        const pData = Object.values(planets).find(cp => cp.name === p.name);
                                        const dignity = pData?.dignity;
                                        // Calculate precise degree
                                        const longitude = pData?.longitude || p.longitude || 0;
                                        const deg = Math.floor(longitude % 30);
                                        const min = Math.floor((longitude % 1) * 60);
                                        const displayDegree = `${deg}° ${min}'`;

                                        // Handle Ascendant Dignity Case
                                        const displayDignity = p.name === 'Ascendant' ? 'Lagna' : (dignity || 'Nuetral');

                                        return (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px 14px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '10px',
                                                border: '1px solid var(--card-border)'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--foreground)', fontSize: '0.95rem' }}>
                                                        {language === 'hi' ? PLANET_HINDI[p.name] || p.name : p.name}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontFamily: 'monospace', opacity: 0.8 }}>
                                                        {displayDegree}
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: '900',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: dignity || p.name === 'Ascendant' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)',
                                                    color: dignity || p.name === 'Ascendant' ? '#000' : 'var(--text-muted)',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {displayDignity}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.4, fontStyle: 'italic', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px' }}>
                                    Quiescent Energy
                                </div>
                            )}
                        </div>

                        {/* Main: Narrative */}
                        <div className="modal-narrative-box">
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{
                                    fontSize: '1.05rem',
                                    color: 'var(--foreground)',
                                    lineHeight: '1.8',
                                    fontWeight: '400',
                                    margin: 0,
                                    opacity: 0.9,
                                    maxWidth: '600px'
                                }}>
                                    {HOUSE_THEMES[activeHouse!].theme}
                                </p>

                                {/* The half that was missing. The paragraph above
                                    explains what the house governs and is the same
                                    for everyone, which is correct — a house means
                                    what it means. This says what it holds in THIS
                                    chart: the sign it falls in, who sits there, and
                                    where its ruler went. Derived from the stored
                                    chart, so it costs nothing and cannot drift from
                                    the diagram behind the modal. */}
                                {houseContext?.inYourChart && (
                                    <p style={{
                                        marginTop: '18px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid var(--card-border)',
                                        fontSize: '1.02rem',
                                        lineHeight: '1.75',
                                        color: 'var(--foreground)',
                                        maxWidth: '600px'
                                    }}>
                                        <strong style={{ color: 'var(--accent-gold)' }}>In your chart. </strong>
                                        {houseContext.inYourChart}
                                    </p>
                                )}
                            </div>

                            <div style={{
                                padding: '20px 24px',
                                borderLeft: '3px solid var(--accent-gold)',
                                background: 'rgba(181, 137, 46, 0.06)',
                                borderRadius: '0 16px 16px 0'
                            }}>
                                <h6 style={{ color: 'var(--accent-gold)', margin: '0 0 6px 0', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Awareness Practice
                                </h6>
                                <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--secondary)', lineHeight: '1.7', margin: 0 }}>
                                    {HOUSE_THEMES[activeHouse!].awareness}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div
            className="chart-display-container"
            style={{
                width: '100%',
                margin: '0 auto',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
            }}
        >
            {/* 1. Language Toggle
                Measured at 42x22 on a 375px phone, which fails even the 24px
                minimum, let alone the 44px one — and this is a control people
                tap with a thumb while holding the phone. Sized up to 44 and
                given aria-pressed, which it never had: without it a screen
                reader announces two identical buttons and no current state. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }} role="group" aria-label="Chart language">
                {(['en', 'hi'] as const).map((code) => {
                    const active = language === code;
                    return (
                        <button
                            key={code}
                            onClick={() => setLanguage(code)}
                            aria-pressed={active}
                            style={{
                                minHeight: '44px',
                                minWidth: '56px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--text-12)',
                                padding: '0 16px',
                                borderRadius: '100px',
                                background: active ? 'var(--accent-gold)' : 'var(--bg-soft)',
                                color: active ? 'var(--btn-fg)' : 'var(--secondary)',
                                border: '1px solid ' + (active ? 'var(--accent-gold)' : 'var(--card-border)'),
                                cursor: 'pointer',
                                fontWeight: '800',
                                lineHeight: 1,
                                transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
                            }}
                        >{code === 'en' ? 'EN' : 'हिंदी'}</button>
                    );
                })}
            </div>

            {/* 2. SVG Chart Wrapper - THIS handles the width constraint */}
            <div style={{
                width: typeof width === 'number' ? `${width}px` : width,
                margin: '0 auto',
                maxWidth: '100%',
                position: 'relative'
            }}>
                <svg viewBox="-10 -10 420 420" style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, background: 'transparent', overflow: 'visible' }}>
                    <defs>
                        {/* --nebula-purple and --nebula-gold were never defined
                            anywhere in the codebase. An invalid var() in
                            stop-color falls back to black, so selecting a house
                            filled it with a black gradient. */}
                        <linearGradient id="activeHouseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(181, 137, 46, 0.30)" />
                            <stop offset="100%" stopColor="rgba(181, 137, 46, 0.12)" />
                        </linearGradient>
                        {/* Was iris-over-navy — a dark-theme wash that read as
                            correct depth on the old indigo page and as a grey
                            smear over parchment. The sheet shows through now;
                            the house is a tint of the paper, not a panel on it. */}
                        <radialGradient id="houseGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(181, 137, 46, 0.07)" />
                            <stop offset="100%" stopColor="rgba(122, 44, 18, 0.06)" />
                        </radialGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(181, 137, 46, 0.25)" />
                            <stop offset="100%" stopColor="rgba(181, 137, 46, 0)" />
                        </radialGradient>
                    </defs>

                    {/* Mystical Background Glow */}
                    <circle cx="200" cy="200" r="190" fill="url(#centerGlow)" pointerEvents="none" />

                    {/* Background Polygons */}
                    {houses.map((house) => {
                        const isActive = activeHouse === house.num;
                        return (
                            <path
                                key={`bg-${house.num}`}
                                d={house.path}
                                fill={isActive ? 'url(#activeHouseGradient)' : 'url(#houseGlow)'}
                                /* Iris (--brand-secondary) was the cosmic
                                   theme's line colour — legible at 5.26:1, but
                                   from the retired palette. Gold ink at 5.60:1
                                   reads as ruling on a manuscript; coral marks
                                   the selected house. --accent-gold-decor was
                                   the obvious choice and is wrong: 1.81:1 is
                                   ornament contrast, and these rulings carry
                                   the chart's structure. */
                                stroke={isActive ? 'var(--accent-coral)' : 'var(--accent-gold)'}
                                strokeWidth={isActive ? "2" : "1"}

                                onClick={() => setActiveHouse(house.num)}
                                style={{ cursor: 'pointer', transition: 'stroke 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), stroke-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), fill 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                                className="chart-house-path"
                            />
                        );
                    })}

                    {/* Main Grid Lines - Thick Outer Border */}
                    <g pointerEvents="none" stroke="var(--accent-gold)" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" fill="none" filter="url(#glow)">
                        <rect x="0" y="0" width="400" height="400" />
                    </g>
                    
                    {/* Inner Diamond Lines */}
                    <g pointerEvents="none" stroke="var(--border-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8">
                        <line x1="0" y1="0" x2="400" y2="400" />
                        <line x1="400" y1="0" x2="0" y2="400" />
                        <path d="M 200,0 L 400,200 L 200,400 L 0,200 Z" />
                    </g>

                    {/* Center Symbol */}
                    <g opacity="0.6" pointerEvents="none" filter="url(#glow)">
                        <circle cx="200" cy="200" r="45" fill="none" stroke="var(--accent-gold)" strokeWidth="0.8" strokeDasharray="4 4" className="pulse-rotation" />
                        <circle cx="200" cy="200" r="35" fill="none" stroke="var(--accent-gold)" strokeWidth="0.5" opacity="0.5" className="pulse-glow" />
                        <text x="200" y="204" textAnchor="middle" fontSize="10" fill="var(--accent-gold)" fontWeight="600" letterSpacing="5" fontFamily="var(--font-heading)">AskChetna</text>
                    </g>

                    {/* Text Content */}
                    {houses.map((house) => {
                        const signNum = ((ascSignIdx + house.num - 1) % 12) + 1;
                        const housePlanets = planetsInHouses[house.num] || [];
                        const isActive = activeHouse === house.num;

                        return (
                            <g key={`text-${house.num}`} onClick={() => setActiveHouse(house.num)} style={{ cursor: 'pointer' }}>
                                <path d={house.path} fill="transparent" stroke="none" />

                                <text
                                    x={house.textX}
                                    y={house.textY}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="18"
                                    fill="var(--accent-gold)"
                                    opacity="0.95"
                                    fontWeight="400"
                                    fontFamily="var(--font-heading)"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {signNum}
                                </text>

                                <text
                                    x={house.textX + (house.num === 1 ? 0 : [2, 12, 11, 10, 9, 8].includes(house.num) ? 40 : -40)}
                                    y={house.textY + ([1, 2, 12, 11, 3, 10].includes(house.num) ? -40 : 40)}
                                    textAnchor="middle"
                                    fontSize="10"
                                    /* Was cream at 50% alpha — a dark-theme
                                       value that measured near 1:1 on paper. */
                                    fill="var(--text-muted)"
                                    opacity="0.9"
                                    fontWeight="600"
                                    fontFamily="var(--font-main)"
                                    letterSpacing="1"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    H{house.num}
                                </text>

                                {housePlanets.map((planetObj, idx) => {
                                    const total = housePlanets.length;
                                    let posX = house.textX;
                                    let posY = house.textY;
                                    const isKendra = [1, 4, 7, 10].includes(house.num);
                                    
                                    // dynamically reduce font size & spacing for crowded houses
                                    const isCrowded = total > 4;
                                    const colWidth = isCrowded ? 24 : 32;
                                    const rowHeight = isCrowded ? 14 : 20;

                                    if (isKendra) {
                                        const half = Math.ceil(total / 2);
                                        const isTop = idx < half;
                                        const localIdx = isTop ? idx : idx - half;
                                        const rowTotal = isTop ? half : total - half;
                                        
                                        const rowsPerHalf = Math.ceil(rowTotal / 3);
                                        const r = Math.floor(localIdx / 3);
                                        const c = localIdx % 3;
                                        const itemsInRow = Math.min(rowTotal - r * 3, 3);
                                        
                                        const startX = -((itemsInRow - 1) * colWidth) / 2;
                                        const yOffset = isTop ? -25 - ((rowsPerHalf - 1 - r) * rowHeight) : 25 + (r * rowHeight);
                                        
                                        posX += startX + (c * colWidth);
                                        posY += yOffset;
                                    } else {
                                        const isVertical = [3, 5, 9, 11].includes(house.num);
                                        if (isVertical) {
                                            const maxRows = total >= 7 ? 3 : (total > 4 ? Math.ceil(total / 2) : total);
                                            const cols = Math.ceil(total / maxRows);
                                            const c = Math.floor(idx / maxRows);
                                            const r = idx % maxRows;
                                            const itemsInCol = Math.min(total - c * maxRows, maxRows);
                                            
                                            const startX = -((cols - 1) * colWidth) / 2;
                                            const startY = -((itemsInCol - 1) * rowHeight) / 2;
                                            
                                            posX += (house.num === 3 || house.num === 5 ? 25 : -25) + startX + (c * colWidth);
                                            posY += startY + (r * rowHeight);
                                        } else {
                                            const maxCols = total >= 7 ? 3 : (total > 4 ? Math.ceil(total / 2) : total);
                                            const rows = Math.ceil(total / maxCols);
                                            const r = Math.floor(idx / maxCols);
                                            const c = idx % maxCols;
                                            const itemsInRow = Math.min(total - r * maxCols, maxCols);
                                            
                                            const startX = -((itemsInRow - 1) * colWidth) / 2;
                                            const startY = -((rows - 1) * rowHeight) / 2;
                                            
                                            posX += startX + (c * colWidth);
                                            posY += (house.num === 2 || house.num === 12 ? 25 : -25) + startY + (r * rowHeight);
                                        }
                                    }

                                    const degree = Math.floor((planetObj.longitude || 0) % 30);
                                    let fSize = planetObj.name === 'Ascendant' ? 12 : 11;
                                    if (isCrowded) fSize = Math.max(8, fSize - 2);

                                    return (
                                        <text
                                            key={idx}
                                            x={posX}
                                            y={posY}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize={fSize}
                                            fill={isActive ? "var(--background)" : "var(--primary)"}
                                            fontWeight={planetObj.name === 'Ascendant' ? "700" : "500"}
                                            fontFamily="var(--font-main)"
                                            style={{ pointerEvents: 'none', transition: 'opacity 0.3s ease, fill 0.3s ease, text-shadow 0.3s ease', textShadow: isActive ? 'none' : '0px 2px 4px rgba(0,0,0,0.5)' }}
                                        >
                                            {getPlanetLabel(planetObj.name === 'Asc' ? 'Ascendant' : planetObj.name)}
                                        </text>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Portal for Modal */}
            {mounted && activeHouse && createPortal(
                <AnimatePresence>
                    {activeHouse && <ModalOverlay />}
                </AnimatePresence>,
                document.body
            )}

            <style>{`
                .modal-content-grid {
                    display: grid;
                    grid-template-columns: 260px 1fr;
                    gap: 40px;
                    align-items: start;
                }
                @media (max-width: 800px) {
                    .modal-content-grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                    .modal-sidebar { order: 2; }
                    .modal-narrative-box { order: 1; }
                }
                .chart-display-container {
                    position: relative;
                }
                .chart-house-path:hover {
                    fill: url(#activeHouseGradient);
                    stroke-width: 2px;
                    stroke: var(--accent-gold);
                }
                @keyframes pulse-glow-anim {
                    0% { opacity: 0.3; transform: scale(0.98); transform-origin: center; stroke-width: 0.5; }
                    50% { opacity: 0.8; transform: scale(1.02); transform-origin: center; stroke-width: 1.5; }
                    100% { opacity: 0.3; transform: scale(0.98); transform-origin: center; stroke-width: 0.5; }
                }
                .pulse-glow {
                    animation: pulse-glow-anim 4s infinite ease-in-out;
                }
                @keyframes slow-rotate {
                    0% { transform: rotate(0deg); transform-origin: 200px 200px; }
                    100% { transform: rotate(360deg); transform-origin: 200px 200px; }
                }
                .pulse-rotation {
                    animation: slow-rotate 60s linear infinite;
                }
            `}</style>
        </div>
    );
}
