'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { ArrowRight, TrendingUp, Clock, MessageSquare, BookOpen } from 'lucide-react';
import DailyInsightCard from '@/components/DailyInsightCard';
import CurrentChapterCard from '@/components/CurrentChapterCard';
import RashiBadge from '@/components/RashiBadge';
import EnergyWidget from '@/components/EnergyWidget';
import PanchangWidget from '@/components/PanchangWidget';
import CosmicMandala from '@/components/CosmicMandala';
import RashiMedallions from '@/components/sections/RashiMedallions';
import NineGrahas from '@/components/sections/NineGrahas';
import HowItWorks from '@/components/sections/HowItWorks';
import Masthead from '@/components/Masthead';
import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

// The twelve rashis now live in RashiMedallions, alongside their artwork slots.

export default function Home() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const hasTrackedLandingView = useRef(false);

  useEffect(() => {
    if (isLoggedIn || hasTrackedLandingView.current) {
      return;
    }

    hasTrackedLandingView.current = true;
    void trackEvent(ANALYTICS_EVENTS.LANDING_VIEW, {
      metadata: {
        loggedIn: false,
      },
    });
  }, [isLoggedIn]);

  // An approved astrologer never gets here: the proxy rewrites "/" to their own
  // desk before this renders. Branching in this component instead would paint
  // the seeker home first and swap it out, because the server cannot know who
  // is asking until the session resolves on the client.

  return (
    <main className={styles.main}>
      {isLoggedIn ? (
        <section className={styles.dashboard}>
          <div className={styles.dashboardGrid}>
            {/* Mandala watermark for logged-in home too */}
            <div className={styles.dashboardMandalaBg} aria-hidden="true">
              <CosmicMandala size={500} opacity={0.05} animate />
            </div>
            <div className={styles.dashboardHeader}>
              <div>
                <span className="cosmic-label">✦ Namaste</span>
                <h1 className={styles.welcomeText}>
                  Welcome back, <span className={styles.userName}>{session?.user?.name?.split(' ')[0] || 'Seeker'}</span>
                </h1>
                <p className={styles.dashboardSubtitle}>
                  Observe your patterns and act with awareness today.
                </p>
                {/* Identifies WHOSE day the note below is about, before the
                    note itself. Renders nothing until the chart is available,
                    so it never shows a placeholder rashi. */}
                <RashiBadge />
              </div>
              <Link href="/dashboard" className={styles.primaryBtnSmall}>
                Dashboard <ArrowRight size={16} />
              </Link>
            </div>

            {/* Two columns split by WHOSE information it is, not by importance.
                Left is about this seeker: the note written for them today, and
                the multi-year chapter that note sits inside. Right is today's
                sky, which is identical for everyone, plus the ways on.

                The columns are sized to end together. Measured at 1200px:
                left 794px against right 845px. That balance is the point — an
                earlier arrangement left ~360px of blank parchment under the
                shorter column, so anything added to one side should be checked
                against the other rather than dropped in. Panchang sits below
                both, full width, because it is the one widget whose height the
                reader changes. */}
            <div className={styles.widgetGrid}>
              <div className={styles.mainColumn}>
                {/* First deliberately: the one thing here written about this
                    seeker specifically, and the reason to open the app on a
                    given morning. */}
                <DailyInsightCard />
                {/* The years-long chapter the daily note above sits inside.
                    Renders nothing until it has a real phase. */}
                <CurrentChapterCard />
              </div>

              <div className={styles.sideColumn}>
                <EnergyWidget />
                <div className={styles.quickLinks}>
                  <Link href="/chart" className={styles.quickLinkItem}>
                    <TrendingUp size={20} color="var(--accent-gold)" />
                    <span>My Chart</span>
                  </Link>
                  <Link href="/timing" className={styles.quickLinkItem}>
                    <Clock size={20} color="var(--accent-gold)" />
                    <span>Timeline</span>
                  </Link>
                  <Link href="/clarity" className={styles.quickLinkItem}>
                    <MessageSquare size={20} color="var(--accent-gold)" />
                    <span>Ask Chetna</span>
                  </Link>
                  {/* Journaling moved off this page: a composer here duplicated
                      /journal, and an input box was the weakest thing in the
                      page's best column. The habit keeps its entry point. */}
                  <Link href="/journal" className={styles.quickLinkItem}>
                    <BookOpen size={20} color="var(--accent-gold)" />
                    <span>Journal</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Full width, below both columns, rather than inside the narrow
                rail. Expanding it there added ~600px to one side and reopened
                the blank panel this layout exists to avoid; across the full
                width its five elements and three timing boxes lay out in one
                row each instead of a stack. Both inner grids are already
                auto-fit, so they spread on their own. */}
            <div className={styles.panchangRow}>
              <PanchangWidget />
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* The illustrated masthead IS the hero. The design has no headline
              block under it — an argument set in 56px type competing with the
              artwork was the reason the banner never landed. */}
          <Masthead />

          <RashiMedallions />

          {/* ═══════════════════════════════════
              HOW IT WORKS — three illustrated steps
              ═══════════════════════════════════ */}
          <HowItWorks />

          <NineGrahas />

        </>
      )}
    </main>
  );
}