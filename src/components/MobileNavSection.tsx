'use client';

import { ChevronDown } from 'lucide-react';
import styles from './MobileNavSection.module.css';

/**
 * One collapsible group in the mobile drawer.
 *
 * The drawer used to render every group expanded at once. Five headings and
 * seventeen destinations is a wall you scroll rather than a menu you read —
 * grouping the rows without collapsing them just labelled the wall.
 *
 * Accordion, not independent toggles: opening one closes the rest, so the
 * drawer stays roughly one screen tall no matter how much lives inside it.
 * The group holding the current page opens on its own, so the drawer always
 * says where you are before you touch anything.
 */
export default function MobileNavSection({
    title,
    open,
    onToggle,
    children,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    const panelId = `mobile-nav-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;

    return (
        <div className={styles.section}>
            <button
                type="button"
                className={`${styles.header} ${open ? styles.headerOpen : ''}`}
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={panelId}
            >
                <span className={styles.title}>{title}</span>
                <ChevronDown size={18} className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true" />
            </button>

            {/* Unmounted rather than hidden: a closed group's links should not
                be focusable, and a screen reader should not read out five
                sections' worth of destinations to get past the first. */}
            {open && (
                <div className={styles.panel} id={panelId}>
                    {children}
                </div>
            )}
        </div>
    );
}
