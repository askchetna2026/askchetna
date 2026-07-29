import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getSettings } from '@/lib/consultations/settings';
import AstrologerDirectory from '@/components/consultations/AstrologerDirectory';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Talk to an Astrologer | AskChetna',
    description:
        'Consult a verified Vedic astrologer over chat. Credits are spent per session, and you choose whether to continue.',
    alternates: { canonical: '/consult' },
};

export default async function ConsultPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/consult');
    }

    // Read on the server so the price is correct on first paint. Fetching it
    // client-side would show a placeholder, and a number that changes after
    // render is the wrong thing to do with a price.
    const settings = await getSettings();
    const minutesPerCredit = Math.round(settings.CHAT_SECONDS_PER_CREDIT / 60);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <span className="cosmic-label">❋ Sambhashana · Consultation ❋</span>
                <h1 className="mystic-text">Talk to an Astrologer</h1>
                <div className="sacred-divider"></div>
                <p className={styles.intro}>
                    One credit opens {minutesPerCredit} minutes of chat. When the time is
                    nearly up you can add another credit to keep going — nothing is charged
                    without you choosing it.
                </p>
            </header>

            <AstrologerDirectory minutesPerCredit={minutesPerCredit} />
        </div>
    );
}
