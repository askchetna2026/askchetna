'use client';

import { useState } from 'react';
import styles from './Term.module.css';
import { GLOSSARY } from '@/lib/glossary';

export { GLOSSARY } from '@/lib/glossary';

// "Moon Sign" reads as "Your Gemini Moon", not "Your Gemini Moon Sign".
const SUBJECT: Record<string, string> = { ascendant: 'Ascendant', moonsign: 'Moon' };

function personalExample(
    entry: (typeof GLOSSARY)[string],
    termKey: string,
    sign?: string,
): string | null {
    if (!sign || !entry.bySign) return null;
    const predicate = entry.bySign[sign];
    // An unrecognised sign falls back rather than composing a broken sentence.
    if (!predicate) return null;
    return `Your ${sign} ${SUBJECT[termKey.toLowerCase()]} ${predicate}`;
}

export default function Term({
    termKey,
    sign,
    children,
}: {
    termKey: string;
    /** The reader's own sign for this term, when one is on screen. Swaps the
     *  generic example for one about their chart. */
    sign?: string;
    children?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const entry = GLOSSARY[termKey.toLowerCase()];
    if (!entry) return <>{children}</>;

    const tooltipId = `term-${termKey.toLowerCase()}`;
    const example = personalExample(entry, termKey, sign) ?? entry.example;

    return (
        <span
            className={styles.term}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={() => setOpen((o) => !o)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpen((o) => !o);
                } else if (e.key === 'Escape') {
                    setOpen(false);
                }
            }}
            tabIndex={0}
            role="button"
            aria-expanded={open}
            aria-describedby={open ? tooltipId : undefined}
        >
            {children || entry.label}
            {open && (
                <span className={styles.tooltip} role="tooltip" id={tooltipId}>
                    <strong>{entry.label}</strong>
                    <span className={styles.plain}>{entry.plain}</span>
                    <span className={styles.example}>{example}</span>
                </span>
            )}
        </span>
    );
}
