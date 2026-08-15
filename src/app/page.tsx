'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { ArrowRight, TrendingUp, Clock, MessageSquare } from 'lucide-react';
import DailyInsightCard from '@/components/DailyInsightCard';
import RashiBadge from '@/components/RashiBadge';
import EnergyWidget from '@/components/EnergyWidget';
import JournalWidget from '@/components/JournalWidget';
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
                All four widgets used to stack in the main column while the side
                column held three links — 751px of content beside 417px that was
                two-thirds empty, and a page that scrolled further than it
                needed to.

                Left is about this seeker: the note written for them, and the
                journal they write back into. Right is today's sky, which is
                identical for everyone, plus the ways on. */}
            <div className={styles.widgetGrid}>
              <div className={styles.mainColumn}>
                {/* First deliberately: the one thing here written about this
                    seeker specifically, and the reason to open the app on a
                    given morning. */}
                <DailyInsightCard />
                <JournalWidget />
              </div>

              <div className={styles.sideColumn}>
                <EnergyWidget />
                <PanchangWidget />
                <div className={styles.quickLinks}>
                  <Link href="/chart" className={styles.quickLinkItem}>
                    <TrendingUp size={24} color="var(--accent-gold)" />
                    <span>See My Chart</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/timing" className={styles.quickLinkItem}>
                    <Clock size={24} color="var(--accent-gold)" />
                    <span>View Your Timeline</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/clarity" className={styles.quickLinkItem}>
                    <MessageSquare size={24} color="var(--accent-gold)" />
                    <span>Ask Chetna AI</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
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