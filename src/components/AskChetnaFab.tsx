'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import styles from './AskChetnaFab.module.css';

// Mobile-only floating action button that keeps "Ask Chetna AI"
// — the highest-value action — accessible from any page on small screens.
export default function AskChetnaFab() {
    const pathname = usePathname();

    // Hide where it is redundant, and anywhere it would sit on top of a
    // composer. A consultation pins its input to the bottom of the viewport,
    // which is exactly where this floats — it covered the send button, and a
    // control that obscures the one you need is worse than one that is missing.
    // startsWith rather than equality, because a consultation is /consult/<id>.
    if (
        pathname === '/login' ||
        pathname?.startsWith('/clarity') ||
        pathname?.startsWith('/consult')
    ) {
        return null;
    }

    return (
        // The plain class is a hook for globals.css, which cannot see a CSS
        // module's hashed name — see AppScreenChrome.
        <Link href="/clarity" className={`app-floating-chrome ${styles.fab}`} aria-label="Ask Chetna AI">
            <MessageSquare size={22} />
            <span className={styles.label}>Ask Chetna</span>
        </Link>
    );
}
