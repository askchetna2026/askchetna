'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard, UserCog, Settings, LogOut, ShieldCheck, Sparkles, Languages, Bookmark
} from 'lucide-react';
import { isClientNativeApp } from '@/lib/platform';
import { useComplexity } from '@/context/ComplexityContext';
// terms.ts only — context.ts is Node-only and must never reach a client bundle.
import { LANGUAGES, DEFAULT_LANGUAGE, isLanguage } from '@/lib/i18n/terms';
import type { Language } from '@/lib/i18n/terms';
import styles from './ProfileMenu.module.css';

/**
 * Single entry point for everything about "me": dashboard, account, admin,
 * sign out. Replaces three separate top-level nav items.
 *
 * Account deletion stays ONE tap from here, not buried behind a submenu. Both
 * App Store 5.1.1(v) and Play require it to be easy to find, and consolidating
 * navigation is exactly the kind of change that quietly pushes it further away.
 * The Account entry says what it contains for the same reason.
 */
export default function ProfileMenu() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { complexity, setComplexity } = useComplexity();

    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
    const [savingLanguage, setSavingLanguage] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated') return;
        let cancelled = false;
        fetch('/api/user/language')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && isLanguage(data?.language)) setLanguage(data.language);
            })
            .catch(() => {
                // English is the default and the fallback; nothing to report.
            });
        return () => { cancelled = true; };
    }, [status]);

    /**
     * Two languages, so a cycle rather than a picker. A select for a binary
     * choice is a menu with one useful row in it.
     */
    const cycleLanguage = async () => {
        if (savingLanguage) return;
        const next: Language = language === 'en' ? 'hi' : 'en';

        setSavingLanguage(true);
        setLanguage(next);
        try {
            const res = await fetch('/api/user/language', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: next }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setLanguage(language);
        } finally {
            setSavingLanguage(false);
        }
    };
    const ref = useRef<HTMLDivElement>(null);

    // App Info is meaningful in the app and meaningless in a browser. Safe to
    // read during render: the menu only mounts on click, long after hydration.
    const isAppShell = isClientNativeApp();

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Close on navigation, otherwise the menu hangs over the new page.
    // Adjusted during render rather than in an effect — React's documented way
    // to reset state when a prop or derived value changes. An effect would
    // leave the menu visible for one committed frame on the new route.
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setOpen(false);
    }

    if (!session?.user) return null;

    const initial =
        session.user.name?.trim()?.[0]?.toUpperCase() ??
        session.user.email?.[0]?.toUpperCase() ??
        '?';

    return (
        <div className={styles.wrap} ref={ref}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Your account"
            >
                {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className={styles.avatar} />
                ) : (
                    <span className={styles.initial} aria-hidden="true">
                        {initial}
                    </span>
                )}
            </button>

            {open && (
                <div className={styles.menu} role="menu">
                    <div className={styles.identity}>
                        <span className={styles.name}>{session.user.name ?? 'Your account'}</span>
                        <span className={styles.email}>{session.user.email}</span>
                    </div>

                    <button
                        type="button"
                        className={styles.item}
                        role="menuitem"
                        onClick={(e) => {
                            e.preventDefault();
                            setComplexity(complexity === 'SIMPLE' ? 'TECHNICAL' : 'SIMPLE');
                        }}
                    >
                        <Settings size={17} />
                        {/* Was labelled "Language Mode", which it never was —
                            it switches how much jargon is shown, and sat right
                            where a real language switch belongs. Renamed so the
                            two are not confused now that one exists. */}
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            Detail: {complexity === 'SIMPLE' ? 'Simple' : 'Technical'}
                            <small className={styles.sub}>
                                {complexity === 'SIMPLE' ? 'Jargon hidden' : 'Full astrological data'}
                            </small>
                        </span>
                    </button>

                    <button
                        type="button"
                        className={styles.item}
                        role="menuitem"
                        onClick={(e) => {
                            e.preventDefault();
                            void cycleLanguage();
                        }}
                        disabled={savingLanguage}
                    >
                        <Languages size={17} />
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            Language: {LANGUAGES.find((l) => l.code === language)?.native ?? 'English'}
                            <small className={styles.sub}>
                                {/* Said plainly, because a switch that changes
                                    less than a reader expects is worse than one
                                    that says what it does. */}
                                What Chetna writes in. The app&rsquo;s own labels stay English for now.
                            </small>
                        </span>
                    </button>

                    <Link href="/dashboard" className={styles.item} role="menuitem">
                        <LayoutDashboard size={17} /> Dashboard
                    </Link>

                    {/* Beside Dashboard rather than in the main bar: this is a
                        personal collection, which is what this menu holds. */}
                    <Link href="/saved" className={styles.item} role="menuitem">
                        <Bookmark size={17} /> Saved insights
                    </Link>

                    {/* Deletion lives behind this. Labelled so it is findable
                        without knowing it is called "account". */}
                    <Link href="/account" className={styles.item} role="menuitem">
                        <UserCog size={17} />
                        <span>
                            Account
                            <small className={styles.sub}>Profile, credits, delete account</small>
                        </span>
                    </Link>

                    <Link href="/astrologer" className={styles.item} role="menuitem">
                        <Sparkles size={17} /> Astrologer
                    </Link>

                    {isAppShell && (
                        <Link href="/app-info" className={styles.item} role="menuitem">
                            <Settings size={17} /> App Info
                        </Link>
                    )}

                    {session.user.isAdmin && (
                        <Link href="/admin" className={`${styles.item} ${styles.admin}`} role="menuitem">
                            <ShieldCheck size={17} /> Admin
                        </Link>
                    )}

                    <button
                        type="button"
                        className={`${styles.item} ${styles.signOut}`}
                        role="menuitem"
                        onClick={() => signOut({ callbackUrl: '/' })}
                    >
                        <LogOut size={17} /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
