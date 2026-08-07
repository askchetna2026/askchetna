'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import styles from './AskChetnaFab.module.css';

// Mobile-only floating action button that keeps "Ask Chetna AI"
// — the highest-value action — accessible from any page on small screens.
export default function AskChetnaFab() {
    const pathname = usePathname();

    // Hide on the clarity page itself and on auth pages where it'd be redundant.
    if (pathname === '/clarity' || pathname === '/login') return null;

    return (
        // The plain class is a hook for globals.css, which cannot see a CSS
        // module's hashed name — see AppScreenChrome.
        <Link href="/clarity" className={`app-floating-chrome ${styles.fab}`} aria-label="Ask Chetna AI">
            <MessageSquare size={22} />
            <span className={styles.label}>Ask Chetna</span>
        </Link>
    );
}
