'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { ArrowRight, TrendingUp, Clock, MessageSquare } from 'lucide-react';
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
              </div>
              <Link href="/dashboard" className={styles.primaryBtnSmall}>
                Dashboard <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.widgetGrid}>
              <div className={styles.mainColumn}>
                <EnergyWidget />
                <PanchangWidget />
                <JournalWidget />
              </div>

              <div className={styles.sideColumn}>
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