'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Header.module.css';
import Logo from './Logo';
import ProfileMenu from './ProfileMenu';
import { Menu, X, CreditCard, LayoutDashboard, LogOut, Info, BookOpen, MessageSquare, Sparkles, Users, UserCog, Settings, Compass, Orbit, Bookmark } from 'lucide-react';
import { PAYMENTS_ENABLED } from '@/lib/paymentConfig';
import { isClientNativeApp } from '@/lib/platform';

export default function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  /**
   * Inside the apps the bottom tab bar already owns Today, Chart, Ask, Timing
   * and Me, so repeating them here leaves two menus answering the same question
   * and neither reading as authoritative. In the app the drawer becomes a true
   * overflow menu; on the web there is no tab bar, so it keeps everything.
   *
   * Reading this during render is safe despite the server having no navigator:
   * the drawer is gated on isMenuOpen, which starts false, so it is absent from
   * the SSR output and only mounts on a click — long after hydration. There is
   * no first paint for the two answers to disagree about.
   */
  const isAppShell = isClientNativeApp();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    // The plain class is a stable hook for globals.css, which cannot see a CSS
    // module's hashed name. Needed because "header" alone is not specific
    // enough: screens use <header> for their own titles, and hiding the site
    // bar by element name took Today's greeting with it.
    <header className={`app-site-header ${styles.header}`}>
      <div className={styles.container}>
        {/* Direct child of the container, and first, so it renders top-LEFT on
            mobile. It used to sit inside .mobileHeaderActions alongside Sign In,
            which pinned it to the right-hand group. Hidden above 1100px, so the
            logo is still the first visible element on desktop. */}
        <button
          className={styles.menuToggle}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isMenuOpen ? 'close' : 'open'}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
          </AnimatePresence>
        </button>

        <Link href="/" onClick={() => setIsMenuOpen(false)}>
          <Logo width={140} height={50} />
        </Link>

        <div className={styles.mobileHeaderActions}>
          {status === 'unauthenticated' && (
            <Link href="/login" className={styles.mobileSignInBtn} onClick={() => setIsMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>

        <div className={styles.desktopNav}>
          <nav className={styles.navLinks}>
            {status === 'authenticated' ? (
              <>
                <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.activeLink : ''}`}>Home</Link>
                <Link href="/chart" className={`${styles.navLink} ${pathname === '/chart' ? styles.activeLink : ''}`}>Birth Chart</Link>
                <Link href="/timing" className={`${styles.navLink} ${pathname === '/timing' ? styles.activeLink : ''}`}>Timing & Seasons</Link>
                <Link href="/clarity" className={`${styles.navCta} ${pathname === '/clarity' ? styles.navCtaActive : ''}`}>Ask Chetna AI</Link>
                {/* Human astrologers, as distinct from the AI above. Placed
                    beside it so the two routes to an answer sit together. */}
                <Link href="/consult" className={`${styles.navLink} ${pathname.startsWith('/consult') ? styles.activeLink : ''}`}>Astrologers</Link>
                <Link href="/synastry" className={`${styles.navLink} ${pathname === '/synastry' ? styles.activeLink : ''}`}>Relationships</Link>
                <Link href="/blog" className={`${styles.navLink} ${pathname === '/blog' ? styles.activeLink : ''}`}>Blog</Link>
                {/* Was /explore, which is now the first stop ON this path
                    rather than a peer of it. One entry point to the reading,
                    instead of two that do not mention each other. */}
                <Link href="/learn" className={`${styles.navLink} ${pathname === '/learn' ? styles.activeLink : ''}`}>Learn</Link>
                {PAYMENTS_ENABLED && (
                  <Link href="/pricing" className={`${styles.navLink} ${pathname === '/pricing' ? styles.activeLink : ''}`}>Credit</Link>
                )}
              </>
            ) : (
              <>
                <Link href="/aura" className={`${styles.navLink} ${pathname === '/aura' ? styles.activeLink : ''}`}>Aura/Navamsa</Link>
                <Link href="/chart" className={`${styles.navLink} ${pathname === '/chart' ? styles.activeLink : ''}`}>Kundli/Chart</Link>
                <Link href="/blog" className={`${styles.navLink} ${pathname === '/blog' ? styles.activeLink : ''}`}>Blog</Link>
                <Link href="/consult" className={`${styles.navLink} ${pathname === '/consult' ? styles.activeLink : ''}`}>Consultations</Link>
                <Link href="/journal" className={`${styles.navLink} ${pathname === '/journal' ? styles.activeLink : ''}`}>Journal</Link>
                <Link href="/about" className={`${styles.navLink} ${pathname === '/about' ? styles.activeLink : ''}`}>About</Link>
              </>
            )}
          </nav>

          <div className={styles.actions}>
            {status === 'authenticated' ? (
              // Dashboard, Account, App Info, Admin and sign out were five
              // separate items competing for space in the bar. One profile
              // control holds them all — with Account still a single tap, since
              // it hosts account deletion and both stores want that findable.
              <ProfileMenu />
            ) : (
              // Two doors, because they serve different people. "Know your
              // prakriti" is the hook for a first-time visitor; it is not a
              // word a RETURNING user scans for, so it was the only control in
              // the bar and there was effectively no way to sign in from the
              // desktop home page.
              <>
                <Link href="/login" className={styles.signInLink}>Sign in</Link>
                <Link href="/login?mode=signup" className={styles.loginBtn}>KNOW YOUR PRAKRITI</Link>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                className={styles.mobileBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                className={styles.mobileMenu}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                <div className={styles.mobileMenuHeader}>
                  <Logo width={120} height={40} />
                </div>

                <nav className={styles.mobileNavLinks}>
                  {status === 'authenticated' ? (
                    <>
                      <Link href="/" className={`${styles.mobileNavLink} ${pathname === '/' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Sparkles size={20} /> Home
                      </Link>
                      {/* Chart, Timing and Ask are tabs in the app — see isAppShell. */}
                      {!isAppShell && (
                        <>
                          <Link href="/chart" className={`${styles.mobileNavLink} ${pathname === '/chart' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <CreditCard size={20} /> Birth Chart
                          </Link>
                          <Link href="/timing" className={`${styles.mobileNavLink} ${pathname === '/timing' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <Info size={20} /> Timing & Seasons
                          </Link>
                          <Link href="/clarity" className={`${styles.mobileNavLink} ${styles.mobileCtaLink} ${pathname === '/clarity' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <MessageSquare size={20} /> Ask Chetna AI
                          </Link>
                        </>
                      )}
                      {/* Not inside the !isAppShell block above: consulting a
                          human astrologer is not a tab, so the drawer is the
                          only way to reach it in the app. */}
                      <Link href="/consult" className={`${styles.mobileNavLink} ${pathname.startsWith('/consult') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Users size={20} /> Talk to an Astrologer
                      </Link>

                      {/* Was footer-only, in the Explore column — which the app
                          hides — so it was unreachable on Android and iOS. */}
                      <Link href="/astrologer/register" className={`${styles.mobileNavLink} ${pathname.startsWith('/astrologer') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Sparkles size={20} /> Become an Astrologer
                      </Link>

                      {/* Admin reaches the console from the app too. isAdmin is
                          already on the session (see the session callback in
                          auth.ts), so no extra request is needed — and every
                          admin route re-checks server-side regardless. */}
                      {/* /admin, not /admin/astrologers — the console's own
                          sidebar reaches every section from there. Deep-linking
                          to one queue was why the app appeared to have an admin
                          area containing nothing but astrologers. */}
                      {session?.user?.isAdmin && (
                        <Link href="/admin" className={`${styles.mobileNavLink} ${pathname.startsWith('/admin') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <UserCog size={20} /> Admin
                        </Link>
                      )}
                      <Link href="/synastry" className={`${styles.mobileNavLink} ${pathname === '/synastry' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Users size={20} /> Relationships
                      </Link>
                      <Link href="/blog" className={`${styles.mobileNavLink} ${pathname === '/blog' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <BookOpen size={20} /> Blog
                      </Link>
                      {/* This drawer is a SEPARATE hardcoded list from the
                          desktop nav above, so anything added there has to be
                          added here too or it does not exist in the app at all
                          — which is exactly what happened to /learn, /patterns
                          and /saved when they shipped. */}
                      <Link href="/patterns" className={`${styles.mobileNavLink} ${pathname === '/patterns' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Orbit size={20} /> Sade Sati &amp; Doshas
                      </Link>
                      <Link href="/saved" className={`${styles.mobileNavLink} ${pathname === '/saved' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Bookmark size={20} /> Saved insights
                      </Link>
                      <Link href="/learn" className={`${styles.mobileNavLink} ${pathname === '/learn' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Compass size={20} /> Learn
                      </Link>
                      {PAYMENTS_ENABLED && (
                        <Link href="/pricing" className={`${styles.mobileNavLink} ${pathname === '/pricing' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <CreditCard size={20} /> Credits
                        </Link>
                      )}
                      {/* Dashboard is the "Today" tab and Account is the "Me" tab in
                          the app.

                          Account deletion lives behind /account, which both stores
                          require to stay reachable in-app. Hiding this entry does NOT
                          weaken that: in the app the Me tab is a permanent bottom-bar
                          destination pointing at the same page, which is more
                          prominent than a link buried in a drawer, not less. On the
                          web there is no tab bar, so the entry stays. */}
                      {!isAppShell && (
                        <>
                          <Link href="/dashboard" className={`${styles.mobileNavLink} ${pathname === '/dashboard' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <LayoutDashboard size={20} /> Dashboard
                          </Link>
                          <Link href="/account" className={`${styles.mobileNavLink} ${pathname === '/account' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <UserCog size={20} /> Account
                          </Link>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href="/" className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Home</Link>
                      <Link href="/about" className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>About Us</Link>
                      {/* The calculators answer without an account, which makes
                          them the most useful thing a signed-out visitor can be
                          handed — and /learn is the hub that reaches them, the
                          rashi pages and the glossary. */}
                      <Link href="/learn" className={`${styles.mobileNavLink} ${pathname === '/learn' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Compass size={20} /> Learn
                      </Link>
                      <Link href="/calculators/moon-sign" className={`${styles.mobileNavLink} ${pathname.startsWith('/calculators') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Orbit size={20} /> Free calculators
                      </Link>
                      <Link href="/blog" className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Blog</Link>
                      <Link href="/clarity" className={`${styles.mobileNavLink} ${styles.mobileCtaLink}`} onClick={() => setIsMenuOpen(false)}>Ask Chetna AI</Link>
                      <Link href="/consult" className={`${styles.mobileNavLink} ${pathname.startsWith('/consult') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Users size={20} /> Talk to an Astrologer
                      </Link>
                      {/* Signed-out users are the ones most likely to be
                          looking for this — it bounces through login and comes
                          straight back via callbackUrl. */}
                      <Link href="/astrologer/register" className={`${styles.mobileNavLink} ${pathname.startsWith('/astrologer') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Sparkles size={20} /> Become an Astrologer
                      </Link>
                    </>
                  )}

                  {/* App Info reports the running build and update state:
                      useful in the app, meaningless in a browser where there is
                      nothing to update. Web gets the download prompt instead —
                      GetTheApp hides itself in-app.

                      Outside the signed-in branch on purpose. It used to sit
                      inside it, which meant the one screen that tells you which
                      deployment the app is talking to was unreachable until you
                      had signed in — and "the signed-out home looks wrong" is
                      exactly the report that needs it. */}
                  {isAppShell && (
                    <Link href="/app-info" className={`${styles.mobileNavLink} ${pathname === '/app-info' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                      <Settings size={20} /> App Info
                    </Link>
                  )}
                </nav>

                <div className={styles.mobileActions}>
                  {status === 'authenticated' ? (
                    <button
                      className={styles.mobileSignOut}
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                    >
                      <LogOut size={20} /> Sign Out
                    </button>
                  ) : (
                    <Link href="/login" className={styles.mobileLoginBtn} onClick={() => setIsMenuOpen(false)}>
                      Sign In to AskChetna
                    </Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
