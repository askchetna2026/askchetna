import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display, Tiro_Devanagari_Hindi } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import WelcomeBanner from '@/components/WelcomeBanner';
import { getWelcomeBonusCredits } from '@/lib/welcomeBonus';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';
import { PLATFORM_BOOTSTRAP_SCRIPT } from '@/lib/platform';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import NativeAppShell from '@/components/NativeAppShell';
import LaunchAnimation from '@/components/app/LaunchAnimation';
import PullToRefresh from '@/components/PullToRefresh';
import AppTabBar from '@/components/AppTabBar';
import PendingDeletionGate from '@/components/PendingDeletionGate';

import AnalyticsTracker from '@/components/AnalyticsTracker';
import FloatingActionButton from '@/components/FloatingActionButton';
import AskChetnaFab from '@/components/AskChetnaFab';
import { ProfileProvider } from '@/context/ProfileContext';
import { ComplexityProvider } from '@/context/ComplexityContext';
import ProfileManager from '@/components/ProfileManager';
import ProfileRequiredGate from '@/components/ProfileRequiredGate';
import { CosmicStarfield } from '@/lib/cosmic/Starfield';
import ScrollToTop from '@/components/ScrollToTop';
import UpdateNotification from '@/components/UpdateNotification';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-main',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

/**
 * Devanagari. Neither Inter nor Playfair carries a single glyph of it, and the
 * product renders Devanagari in two places — the kundali's planet labels
 * behind the EN/हिंदी toggle, and चेतना on /about. Those were falling back to
 * whatever the operating system happened to supply, which differs between
 * Windows, Android and iOS and matches nothing about the manuscript design.
 *
 * It sits at the END of the font stacks below rather than replacing anything:
 * the browser only reaches it for glyphs the Latin faces do not have, so no
 * Latin text changes. Tiro Devanagari Hindi is a text face with real calligraphic
 * roots, which is the same argument the rest of this design makes.
 */
const tiroDevanagari = Tiro_Devanagari_Hindi({
  subsets: ['devanagari', 'latin'],
  variable: '--font-devanagari',
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'AskChetna | Astrology for Awareness',
  description: SITE_DESCRIPTION,
  keywords: ['vedic astrology', 'astrology for awareness', 'vimsottari dasha', 'panchang', 'self-reflection', 'ai astrology'],
  alternates: {
    canonical: '/',
  },
  applicationName: SITE_NAME,
  openGraph: {
    title: 'AskChetna | Astrology for Awareness',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: absoluteUrl('/opengraph-image'),
        width: 1200,
        height: 630,
        alt: 'AskChetna - Astrology for Awareness',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AskChetna | Astrology for Awareness',
    description: SITE_DESCRIPTION,
    images: [absoluteUrl('/opengraph-image')],
  },
  icons: {
    icon: [
      { url: '/chetna_icon.svg', type: 'image/svg+xml' },
      { url: '/icons/chetna.png' },
    ],
    apple: '/chetna_icon.svg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    // Lets the cosmic background bleed under the iOS status bar, which is what
    // the safe-area padding in globals.css then compensates for.
    statusBarStyle: 'black-translucent',
  },
};

/**
 * `viewport-fit=cover` is what makes env(safe-area-inset-*) resolve to real
 * values on notched iOS devices; without it the insets are always 0 and the
 * .native-app padding rules in globals.css do nothing.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /* Matches the parchment default, so the browser and Android status bar chrome
     no longer sits navy against a light page. The native app icon and splash are
     still built on #0B0F2F and need regenerating (`npm run assets`) plus fresh
     App Store screenshots — tracked separately. */
  themeColor: '#F2EAD5',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const welcomeBonusAmount = await getWelcomeBonusCredits();

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        email: 'hello@askchetna.com',
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        potentialAction: {
          '@type': 'SearchAction',
          target: absoluteUrl('/clarity?q={search_term_string}'),
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${tiroDevanagari.variable}`}>
        {/*
          Tags <html> with .native-app / data-app-platform before first paint so
          the app-only safe-area rules apply without a visible reflow. Done with
          a blocking inline script rather than server-side header sniffing on
          purpose: reading headers() in the root layout would force every page —
          including the static SEO landing pages — into dynamic rendering.
        */}
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_BOOTSTRAP_SCRIPT }} />
        {/*
          Outside the providers and first in the body: the opening beat must not
          wait on a session lookup, and it covers the whole app while it plays.
          Renders nothing in a browser, and nothing on a warm start.
        */}
        <LaunchAnimation />
        {/*
          No theme bootstrap. AskChetna has ONE palette — the parchment
          manuscript — so data-theme is a constant on <html> above rather than
          something restored from storage. Any leftover 'chetna-theme' value in
          a returning visitor's localStorage is simply ignored.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
        />
        <div className="cosmic-bg-overlay"></div>
        <div className="stars-layer-1"></div>
        <div className="stars-layer-2"></div>
        <div className="central-portal-glow"></div>
        <div className="noise-overlay"></div>
        <ScrollToTop />
        <AuthProvider>
          {/* Inside the provider because it now asks whether anyone is signed
              in — see Starfield.tsx. Safe to move: it is position:fixed with
              z-index -1, and none of these providers render a DOM wrapper that
              could trap it in a new stacking context. */}
          <CosmicStarfield />
          <ComplexityProvider>
            <ProfileProvider>
              <Header />
            <WelcomeBanner bonusAmount={welcomeBonusAmount} />
            <main className="app-main" style={{ paddingTop: '20px' }}>
              {children}
            </main>
            <Footer />

            {/* Bottom tab navigation. Sits above the routes so it never
                re-mounts on navigation — renders nothing in a browser. */}
            <AppTabBar />

            <ProfileManager />
            {/* Behaviour only: decides when the drawer above must open. */}
            <ProfileRequiredGate />
            <FloatingActionButton />
            <AskChetnaFab />
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
            <ServiceWorkerRegistrar />
            {/* Native-only wiring (splash, status bar, back button, offline
                banner, external links). Renders nothing in a browser. */}
            <NativeAppShell />
            {/* Pull down at the top of a screen to reload it. App only, and
                implemented here rather than natively so it ships with a deploy
                instead of a store submission — the apps point at this site, they
                do not bundle it. */}
            <PullToRefresh />
            {/* Update notification for native app users */}
            <UpdateNotification />
            {/* Locks the account to a cancellation screen while deletion is
                pending — what makes the grace period read as real deletion to
                App Review rather than deactivation. Renders nothing otherwise. */}
            <PendingDeletionGate />
            </ProfileProvider>
          </ComplexityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
