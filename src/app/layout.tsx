import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import WelcomeBanner from '@/components/WelcomeBanner';
import prisma from '@/lib/prisma';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';

import AnalyticsTracker from '@/components/AnalyticsTracker';
import FloatingActionButton from '@/components/FloatingActionButton';
import AskChetnaFab from '@/components/AskChetnaFab';
import { ProfileProvider } from '@/context/ProfileContext';
import ProfileManager from '@/components/ProfileManager';

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
        />
        <div className="cosmic-bg-overlay"></div>
        <div className="stars-layer-1"></div>
        <div className="stars-layer-2"></div>
        <div className="central-portal-glow"></div>
        <div className="noise-overlay"></div>
        <AuthProvider>
          <ProfileProvider>
            <Header />
            <WelcomeBanner bonusAmount={welcomeBonusAmount} />
            <main style={{ paddingTop: '20px' }}>
              {children}
            </main>
            <Footer />

            <ProfileManager />
            <FloatingActionButton />
            <AskChetnaFab />
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
