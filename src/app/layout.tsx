import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import WelcomeBanner from '@/components/WelcomeBanner';
import prisma from '@/lib/prisma';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';
import { PLATFORM_BOOTSTRAP_SCRIPT } from '@/lib/platform';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import NativeAppShell from '@/components/NativeAppShell';
import AppTabBar from '@/components/AppTabBar';
import PendingDeletionGate from '@/components/PendingDeletionGate';

import AnalyticsTracker from '@/components/AnalyticsTracker';
import FloatingActionButton from '@/components/FloatingActionButton';
import AskChetnaFab from '@/components/AskChetnaFab';
import { ProfileProvider } from '@/context/ProfileContext';
import ProfileManager from '@/components/ProfileManager';
import { CosmicStarfield } from '@/lib/cosmic/Starfield';
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
  themeColor: '#0B0F2F',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let welcomeBonusAmount = 10;
  try {
    const welcomeBonusSetting = await prisma.serviceCost.findUnique({
      where: { key: 'WELCOME_BONUS' }
    });
    if (welcomeBonusSetting) {
      welcomeBonusAmount = welcomeBonusSetting.credits;
    }
  } catch (error) {
    console.error('Failed to fetch welcome bonus amount:', error);
  }

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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable}`}>
        {/*
          Tags <html> with .native-app / data-app-platform before first paint so
          the app-only safe-area rules apply without a visible reflow. Done with
          a blocking inline script rather than server-side header sniffing on
          purpose: reading headers() in the root layout would force every page —
          including the static SEO landing pages — into dynamic rendering.
        */}
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_BOOTSTRAP_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
        />
        <CosmicStarfield />
        <div className="cosmic-bg-overlay"></div>
        <div className="stars-layer-1"></div>
        <div className="stars-layer-2"></div>
        <div className="central-portal-glow"></div>
        <div className="noise-overlay"></div>
        <AuthProvider>
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
            <FloatingActionButton />
            <AskChetnaFab />
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
            <ServiceWorkerRegistrar />
            {/* Native-only wiring (splash, status bar, back button, offline
                banner, external links). Renders nothing in a browser. */}
            <NativeAppShell />
            {/* Update notification for native app users */}
            <UpdateNotification />
            {/* Locks the account to a cancellation screen while deletion is
                pending — what makes the grace period read as real deletion to
                App Review rather than deactivation. Renders nothing otherwise. */}
            <PendingDeletionGate />
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
