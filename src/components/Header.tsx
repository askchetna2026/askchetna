'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Header.module.css';
import Logo from './Logo';
import ProfileMenu from './ProfileMenu';
import NavDropdown from './NavDropdown';
import { Menu, X, CreditCard, LayoutDashboard, LogOut, Info, BookOpen, MessageSquare, Sparkles, Users, UserCog, Settings, Compass, Orbit, Bookmark, CalendarClock, Clock, ShieldCheck } from 'lucide-react';
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
                {/* GROUPED to match the mobile drawer.
                    Six pages — the forecast, the muhurat windows, the doshas,
                    prakriti, saved insights and the journal — were added to the
                    drawer and not here, so they existed on a phone and nowhere
                    on a laptop. Appending six more links was not possible: this
                    bar already carried nine and would have wrapped. The headings
                    match the drawer's exactly, so somewhere learnt on a phone is
                    found in the same place on a laptop. */}
                <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.activeLink : ''}`}>Home</Link>

                <NavDropdown
                  className={styles.navLink}
                  label="Your chart"
                  items={[
                    { href: '/chart', label: 'Birth chart', hint: 'The whole chart, and what it holds' },
                    { href: '/prakriti', label: 'Your nature', hint: 'Vata, Pitta or Kapha, read from your chart' },
                    { href: '/patterns', label: 'Sade Sati & doshas', hint: 'What is present, and what is not' },
                  ]}
                />

                <NavDropdown
                  className={styles.navLink}
                  label="Timing"
                  items={[
                    { href: '/timing', label: 'Your life chapters', hint: 'The long periods, past and ahead' },
                    { href: '/forecast', label: "What's coming up", hint: 'Dates something actually changes' },
                    { href: '/muhurat', label: 'Good times today', hint: 'Better and worse hours for a thing' },
                  ]}
                />

                <Link href="/clarity" className={`${styles.navCta} ${pathname === '/clarity' ? styles.navCtaActive : ''}`}>Ask Chetna AI</Link>
                {/* Human astrologers, as distinct from the AI above. Placed
                    beside it so the two routes to an answer sit together. */}
                <Link href="/consult" className={`${styles.navLink} ${pathname.startsWith('/consult') ? styles.activeLink : ''}`}>Astrologers</Link>
                <Link href="/synastry" className={`${styles.navLink} ${pathname === '/synastry' ? styles.activeLink : ''}`}>Relationships</Link>

                {/* Was /explore, which is now the first stop ON this path
                    rather than a peer of it. Blog moved inside it — it is
                    reading, and it was competing with Learn for the same idea. */}
                <NavDropdown
                  className={styles.navLink}
                  label="Learn"
                  items={[
                    { href: '/learn', label: 'Start here', hint: 'Everything in the order it makes sense' },
                    { href: '/calculators/moon-sign', label: 'Free calculators', hint: 'Moon sign, ascendant, nakshatra' },
                    { href: '/blog', label: 'Writing', hint: 'Longer pieces' },
                  ]}
                />

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
              // Two doors, because they serve different people: a hook for a
              // first-time visitor, and a plain way in for a returning one.
              // The hook used to be the ONLY control in the bar, which left no
              // way to sign in from the desktop home page at all.
              //
              // It used to read "KNOW YOUR PRAKRITI", and nothing behind it
              // delivered that — there is no Prakriti feature, only this label.
              // Signup asks for birth details and produces a chart, so that is
              // what the button now promises. A call to action that describes
              // the screen after next is the one place a product cannot afford
              // to be aspirational.
              <>
                <Link href="/login" className={styles.signInLink}>Sign in</Link>
                <Link href="/login?mode=signup" className={styles.loginBtn}>KNOW YOUR CHART</Link>
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
                      {/* GROUPED, because this reached seventeen flat rows and
                          became a wall to scroll rather than a menu to read.
                          The headings are the questions people arrive with —
                          "what does my chart say", "when should I do this",
                          "who can I ask" — not the shape of the codebase. */}

                      <Link href="/" className={`${styles.mobileNavLink} ${pathname === '/' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Sparkles size={20} /> Home
                      </Link>

                      <p className={styles.mobileGroup}>Your chart</p>
                      <div className={styles.mobileGroupLinks}>
                        {/* Chart is a tab in the app — see isAppShell. */}
                        {!isAppShell && (
                          <Link href="/chart" className={`${styles.mobileNavLink} ${pathname === '/chart' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <Orbit size={20} /> Birth chart
                          </Link>
                        )}
                        <Link href="/prakriti" className={`${styles.mobileNavLink} ${pathname === '/prakriti' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <Sparkles size={20} /> Your nature
                        </Link>
                        <Link href="/patterns" className={`${styles.mobileNavLink} ${pathname === '/patterns' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <ShieldCheck size={20} /> Sade Sati &amp; doshas
                        </Link>
                      </div>

                      <p className={styles.mobileGroup}>Timing</p>
                      <div className={styles.mobileGroupLinks}>
                        {!isAppShell && (
                          <Link href="/timing" className={`${styles.mobileNavLink} ${pathname === '/timing' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <Clock size={20} /> Your life chapters
                          </Link>
                        )}
                        <Link href="/forecast" className={`${styles.mobileNavLink} ${pathname === '/forecast' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <CalendarClock size={20} /> What&rsquo;s coming up
                        </Link>
                        <Link href="/muhurat" className={`${styles.mobileNavLink} ${pathname === '/muhurat' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <Clock size={20} /> Good times today
                        </Link>
                      </div>

                      <p className={styles.mobileGroup}>Ask someone</p>
                      <div className={styles.mobileGroupLinks}>
                        {!isAppShell && (
                          <Link href="/clarity" className={`${styles.mobileNavLink} ${styles.mobileCtaLink} ${pathname === '/clarity' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <MessageSquare size={20} /> Ask Chetna AI
                          </Link>
                        )}
                        <Link href="/consult" className={`${styles.mobileNavLink} ${pathname.startsWith('/consult') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <Users size={20} /> Talk to an astrologer
                        </Link>
                        <Link href="/synastry" className={`${styles.mobileNavLink} ${pathname === '/synastry' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <Users size={20} /> Two charts together
                        </Link>
                      </div>

                      <p className={styles.mobileGroup}>Yours</p>
                      <div className={styles.mobileGroupLinks}>
                        <Link href="/journal" className={`${styles.mobileNavLink} ${pathname === '/journal' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <BookOpen size={20} /> Journal
                        </Link>
                        <Link href="/saved" className={`${styles.mobileNavLink} ${pathname === '/saved' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <Bookmark size={20} /> Saved insights
                        </Link>
                        {/* Dashboard is the "Today" tab and Account is the "Me"
                            tab in the app.

                            Account deletion lives behind /account, which both
                            stores require to stay reachable in-app. Hiding this
                            entry does NOT weaken that: in the app the Me tab is
                            a permanent bottom-bar destination pointing at the
                            same page, which is more prominent than a link
                            buried in a drawer, not less. On the web there is no
                            tab bar, so the entry stays. */}
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
                        {PAYMENTS_ENABLED && (
                          <Link href="/pricing" className={`${styles.mobileNavLink} ${pathname === '/pricing' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <CreditCard size={20} /> Credits
                          </Link>
                        )}
                      </div>

                      <p className={styles.mobileGroup}>Learn</p>
                      <div className={styles.mobileGroupLinks}>
                        <Link href="/learn" className={`${styles.mobileNavLink} ${pathname === '/learn' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <Compass size={20} /> Start here
                        </Link>
                        <Link href="/blog" className={`${styles.mobileNavLink} ${pathname === '/blog' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <BookOpen size={20} /> Writing
                        </Link>
                      </div>

                      {/* Kept out of the groups: neither is something a seeker
                          is looking for, and both belong at the bottom. */}
                      <Link href="/astrologer/register" className={`${styles.mobileNavLink} ${pathname.startsWith('/astrologer') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Sparkles size={20} /> Become an astrologer
                      </Link>
                      {session?.user?.isAdmin && (
                        <Link href="/admin" className={`${styles.mobileNavLink} ${pathname.startsWith('/admin') ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <UserCog size={20} /> Admin
                        </Link>
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
