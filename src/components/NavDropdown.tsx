'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import styles from './NavDropdown.module.css';

/**
 * A grouped item in the desktop bar.
 *
 * The mobile drawer was reorganised into five groups and the desktop bar was
 * left alone, so six pages — the forecast, the muhurat windows, the doshas,
 * prakriti, saved insights and the journal — existed on a phone and nowhere on
 * a laptop. Appending six more links was not an option: the bar already carried
 * nine and would have wrapped.
 *
 * So the same grouping goes here, as two dropdowns. The headings match the
 * drawer's exactly, because a person who learns where something lives on their
 * phone should find it in the same place on their laptop.
 */

export interface NavItem {
    href: string;
    label: string;
    /** One line, shown under the label. Optional. */
    hint?: string;
}

export default function NavDropdown({
    label,
    items,
    className,
}: {
    label: string;
    items: NavItem[];
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Close on an outside click or Escape — the same contract ProfileMenu uses,
    // so the two dropdowns in this bar behave identically.
    useEffect(() => {
        const onPointer = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    // Close on navigation, otherwise the panel hangs over the page it just
    // opened, which reads as the click not having worked.
    //
    // Adjusted during render rather than in an effect — React's documented way
    // to reset state when a derived value changes, and the same pattern
    // ProfileMenu already uses. An effect would leave the panel visible for one
    // committed frame on the new route.
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setOpen(false);
    }

    const holdsCurrentPage = items.some((i) => pathname === i.href);

    return (
        <div className={styles.wrap} ref={ref}>
            <button
                type="button"
                className={`${className ?? ''} ${styles.trigger} ${holdsCurrentPage ? styles.triggerActive : ''}`}
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-haspopup="true"
            >
                {label}
                <ChevronDown size={14} className={open ? styles.chevronOpen : styles.chevron} />
            </button>

            {open && (
                <div className={styles.menu} role="menu">
                    {items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.item} ${pathname === item.href ? styles.itemActive : ''}`}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                        >
                            <span className={styles.itemLabel}>{item.label}</span>
                            {item.hint && <small className={styles.itemHint}>{item.hint}</small>}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
