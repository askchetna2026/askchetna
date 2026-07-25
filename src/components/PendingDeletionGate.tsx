'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

/**
 * Locks the app to a cancellation screen while deletion is pending.
 *
 * This is the piece that makes the grace period acceptable to App Review. Both
 * Apple (5.1.1(v)) and Google Play permit *scheduled* deletion, but reject a
 * "deletion" that leaves the account fully usable afterwards — that reads as
 * deactivation. A reviewer who deletes the test account and signs back in must
 * find the account inert, not working.
 *
 * So this renders a full-screen overlay over everything: the only actions
 * available are cancelling the deletion or signing out.
 *
 * Renders nothing for signed-out users and for accounts with no pending
 * deletion, which is the overwhelmingly common case.
 */
export default function PendingDeletionGate() {
    const { data: session, status } = useSession();

    const [pending, setPending] = useState(false);
    const [scheduledFor, setScheduledFor] = useState<string | null>(null);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');

    const userId = session?.user?.id;

    useEffect(() => {
        if (status !== 'authenticated' || !userId) return;

        let cancelled = false;

        void (async () => {
            try {
                const response = await fetch('/api/user/delete-account', { cache: 'no-store' });
                if (!response.ok || cancelled) return;

                const data = await response.json();
                if (cancelled) return;

                setPending(!!data.pending);
                setScheduledFor(data.scheduledFor ?? null);
            } catch {
                // Network failure must not lock people out of their own account.
                // Failing open is right here: the purge cron is the mechanism of
                // record, not this UI.
            }
        })();

        return () => { cancelled = true; };
    }, [status, userId]);

    const handleCancel = useCallback(async () => {
        setWorking(true);
        setError('');
        try {
            const response = await fetch('/api/user/delete-account', { method: 'POST' });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data.error || 'Could not cancel the deletion. Please try again.');
                return;
            }
            // Full reload so every server component re-renders unlocked.
            window.location.reload();
        } catch {
            setError('Could not cancel the deletion. Please try again.');
        } finally {
            setWorking(false);
        }
    }, []);

    if (!pending) return null;

    const deletionDate = scheduledFor
        ? new Date(scheduledFor).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
        })
        : null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-deletion-title"
            style={{
                position: 'fixed',
                inset: 0,
                // Above every other fixed layer in the app (drawers sit at 9999).
                zIndex: 100000,
                background: 'rgba(11, 15, 47, 0.98)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 'calc(32px + env(safe-area-inset-top, 0px)) 24px calc(32px + env(safe-area-inset-bottom, 0px))',
                overflowY: 'auto',
            }}
        >
            <span style={{ fontSize: '2.5rem', color: '#D4AF37', lineHeight: 1 }} aria-hidden="true">✦</span>

            <h1
                id="ac-deletion-title"
                style={{
                    fontFamily: 'var(--font-heading, Georgia, serif)',
                    fontSize: '1.7rem',
                    color: '#DFE0FF',
                    margin: '20px 0 12px',
                }}
            >
                This account is scheduled for deletion
            </h1>

            <p style={{ color: 'rgba(223, 224, 255, 0.75)', maxWidth: '44ch', lineHeight: 1.6, margin: 0 }}>
                {deletionDate
                    ? <>Your account and all of your charts, journal entries and credits will be permanently deleted on <strong style={{ color: '#DFE0FF' }}>{deletionDate}</strong>.</>
                    : <>Your account and all of your charts, journal entries and credits will be permanently deleted shortly.</>}
            </p>

            <p style={{ color: 'rgba(223, 224, 255, 0.6)', maxWidth: '44ch', lineHeight: 1.6, marginTop: 14, fontSize: '0.95rem' }}>
                Until then, your account is locked. You can cancel the deletion to restore full
                access — after that date, nothing can be recovered.
            </p>

            {error && (
                <p style={{ color: '#ffb4ab', marginTop: 18, fontSize: '0.95rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 }}>
                <button
                    type="button"
                    onClick={handleCancel}
                    disabled={working}
                    style={{
                        padding: '13px 30px',
                        borderRadius: 50,
                        border: 'none',
                        background: 'linear-gradient(135deg, #D4AF37, #ffc107)',
                        color: '#1a1a1a',
                        font: 'inherit',
                        fontWeight: 700,
                        cursor: working ? 'default' : 'pointer',
                    }}
                >
                    {working ? 'Cancelling…' : 'Cancel Deletion'}
                </button>

                <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: '/' })}
                    disabled={working}
                    style={{
                        padding: '13px 30px',
                        borderRadius: 50,
                        border: '1px solid rgba(212, 175, 55, 0.45)',
                        background: 'transparent',
                        color: '#D4AF37',
                        font: 'inherit',
                        fontWeight: 600,
                        cursor: working ? 'default' : 'pointer',
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
