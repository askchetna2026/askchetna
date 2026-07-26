'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Header.module.css';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { Menu, X, CreditCard, LayoutDashboard, LogOut, Info, BookOpen, MessageSquare, Sparkles, Users, UserCog, Settings } from 'lucide-react';
import { PAYMENTS_ENABLED } from '@/lib/paymentConfig';

export default function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" onClick={() => setIsMenuOpen(false)}>
          <Logo width={140} height={50} />
        </Link>

        <div className={styles.mobileHeaderActions}>
          {status === 'unauthenticated' && (
            <Link href="/login" className={styles.mobileSignInBtn} onClick={() => setIsMenuOpen(false)}>
              Sign In
            </Link>
          )}
          <button
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
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
        </div>

        <div className={styles.desktopNav}>
          <nav className={styles.navLinks}>
            {status === 'authenticated' ? (
              <>
                <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.activeLink : ''}`}>Home</Link>
                <Link href="/chart" className={`${styles.navLink} ${pathname === '/chart' ? styles.activeLink : ''}`}>Birth Chart</Link>
                <Link href="/timing" className={`${styles.navLink} ${pathname === '/timing' ? styles.activeLink : ''}`}>Timing & Seasons</Link>
                <Link href="/clarity" className={`${styles.navCta} ${pathname === '/clarity' ? styles.navCtaActive : ''}`}>Ask Chetna AI</Link>
                <Link href="/synastry" className={`${styles.navLink} ${pathname === '/synastry' ? styles.activeLink : ''}`}>Relationships</Link>
                <Link href="/blog" className={`${styles.navLink} ${pathname === '/blog' ? styles.activeLink : ''}`}>Blog</Link>
                {PAYMENTS_ENABLED && (
                  <Link href="/pricing" className={`${styles.navLink} ${pathname === '/pricing' ? styles.activeLink : ''}`}>Credit</Link>
                )}
              </>
            ) : (
              <>
                <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.activeLink : ''}`}>Home</Link>
                <Link href="/about" className={`${styles.navLink} ${pathname === '/about' ? styles.activeLink : ''}`}>About</Link>
                <Link href="/blog" className={`${styles.navLink} ${pathname === '/blog' ? styles.activeLink : ''}`}>Blog</Link>
                <Link href="/clarity" className={`${styles.navCta} ${pathname === '/clarity' ? styles.navCtaActive : ''}`}>Ask Chetna AI</Link>
              </>
            )}
          </nav>

          <div className={styles.actions}>
            <ThemeToggle />
            {status === 'authenticated' ? (
              <div className={styles.authGroup}>
                <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.activeLink : ''}`}>
                  Dashboard
                </Link>
                {/* Account settings hosts account deletion, which both stores
                    require to be easy to find rather than buried. */}
                <Link href="/account" className={`${styles.navLink} ${pathname === '/account' ? styles.activeLink : ''}`}>
                  Account
                </Link>
                <Link href="/app-info" className={`${styles.navLink} ${pathname === '/app-info' ? styles.activeLink : ''}`}>
                  App Info
                </Link>
                {session?.user?.isAdmin && (
                  <Link href="/admin" className={`${styles.navLink} ${styles.adminLink} ${pathname === '/admin' ? styles.activeLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={styles.signOutBtn}
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link href="/login" className={styles.loginBtn}>Sign In</Link>
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
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
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
                      <Link href="/chart" className={`${styles.mobileNavLink} ${pathname === '/chart' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <CreditCard size={20} /> Birth Chart
                      </Link>
                      <Link href="/timing" className={`${styles.mobileNavLink} ${pathname === '/timing' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Info size={20} /> Timing & Seasons
                      </Link>
                      <Link href="/clarity" className={`${styles.mobileNavLink} ${styles.mobileCtaLink} ${pathname === '/clarity' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <MessageSquare size={20} /> Ask Chetna AI
                      </Link>
                      <Link href="/synastry" className={`${styles.mobileNavLink} ${pathname === '/synastry' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Users size={20} /> Relationships
                      </Link>
                      <Link href="/blog" className={`${styles.mobileNavLink} ${pathname === '/blog' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <BookOpen size={20} /> Blog
                      </Link>
                      {PAYMENTS_ENABLED && (
                        <Link href="/pricing" className={`${styles.mobileNavLink} ${pathname === '/pricing' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                          <CreditCard size={20} /> Credits
                        </Link>
                      )}
                      <Link href="/dashboard" className={`${styles.mobileNavLink} ${pathname === '/dashboard' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <LayoutDashboard size={20} /> Dashboard
                      </Link>
                      {/* Account deletion lives here. Both stores require it to
                          be reachable in-app, and this is the primary nav in the
                          mobile apps. */}
                      <Link href="/account" className={`${styles.mobileNavLink} ${pathname === '/account' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <UserCog size={20} /> Account
                      </Link>
                      <Link href="/app-info" className={`${styles.mobileNavLink} ${pathname === '/app-info' ? styles.mobileActiveLink : ''}`} onClick={() => setIsMenuOpen(false)}>
                        <Settings size={20} /> App Info
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/" className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Home</Link>
                      <Link href="/about" className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>About Us</Link>
                      <Link href="/blog" className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Blog</Link>
                      <Link href="/clarity" className={`${styles.mobileNavLink} ${styles.mobileCtaLink}`} onClick={() => setIsMenuOpen(false)}>Ask Chetna AI</Link>
                    </>
                  )}
                </nav>

                <div className={styles.mobileActions}>
                  <div className={styles.mobileSeparator} />
                  <div className={styles.mobileRow}>
                    <span>Appearance</span>
                    <ThemeToggle />
                  </div>
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
