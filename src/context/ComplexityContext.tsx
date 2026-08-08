'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ComplexityLevel = 'SIMPLE' | 'TECHNICAL';

interface ComplexityContextType {
    complexity: ComplexityLevel;
    setComplexity: (level: ComplexityLevel) => void;
}

const ComplexityContext = createContext<ComplexityContextType | undefined>(undefined);

export function ComplexityProvider({ children }: { children: React.ReactNode }) {
    const [complexity, setComplexityState] = useState<ComplexityLevel>('SIMPLE');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('askchetna_complexity');
        if (stored === 'SIMPLE' || stored === 'TECHNICAL') {
            setComplexityState(stored);
        }
    }, []);

    const setComplexity = (level: ComplexityLevel) => {
        setComplexityState(level);
        localStorage.setItem('askchetna_complexity', level);
    };

    return (
        <ComplexityContext.Provider value={{ complexity, setComplexity }}>
            {children}
        </ComplexityContext.Provider>
    );
}

export function useComplexity() {
    const context = useContext(ComplexityContext);
    if (context === undefined) {
        throw new Error('useComplexity must be used within a ComplexityProvider');
    }
    return context;
}
