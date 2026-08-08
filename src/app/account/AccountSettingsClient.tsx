'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { signOut } from 'next-auth/react';
import { AlertCircle, Bell, BellOff, ShieldAlert, Trash2, ChevronLeft, Edit2, Save, X } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import { isClientNativeApp } from '@/lib/platform';

interface Props {
    email: string;
    name: string | null;
    phone: string | null;
    /** Password accounts must reauthenticate before deletion. */
    hasPassword: boolean;
    isSubscribed: boolean;
    whatsappOptIn: boolean;
    memberSince: string;
}

type PushState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'loading';

export default function AccountSettingsClient({
    email, name, phone, hasPassword, isSubscribed, whatsappOptIn, memberSince,
}: Props) {
    // Same pattern as PhoneLoginPanel: server snapshot is false, so no hydration
    // mismatch and no setState-in-effect.
    const isNative = useSyncExternalStore(
        () => () => { },
        isClientNativeApp,
        () => false
    );

    const [pushState, setPushState] = useState<PushState>('loading');
    const [pushBusy, setPushBusy] = useState(false);

    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [password, setPassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);

    const [waOptIn, setWaOptIn] = useState(whatsappOptIn);
    const [waBusy, setWaBusy] = useState(false);

    // ---- Profile Editing ----
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name || '');
    const [editPhone, setEditPhone] = useState(phone || '');
    const [saveBusy, setSaveBusy] = useState(false);
    const [currentName, setCurrentName] = useState(name);
    const [currentPhone, setCurrentPhone] = useState(phone);

    const handleSaveProfile = async () => {
        setSaveBusy(true);
        try {
            const res = await fetch('/api/user/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, phone: editPhone }),
            });
            if (res.ok) {
                setCurrentName(editName);
                setCurrentPhone(editPhone);
                setIsEditing(false);
            } else {
                alert('Failed to save profile.');
            }
        } catch (e) {
            alert('An error occurred while saving.');
        } finally {
            setSaveBusy(false);
        }
    };

    // ---- Notification permission ----
    useEffect(() => {
        if (!isNative) {
            setPushState('unsupported');
            return;
        }

        let cancelled = false;
        void (async () => {
            const push = await import('@/lib/native/push');
            const state = await push.getPushPermission();
            if (!cancelled) setPushState(state);
        })();

        return () => { cancelled = true; };
    }, [isNative]);

    const handleEnablePush = useCallback(async () => {
        setPushBusy(true);
        try {
            const push = await import('@/lib/native/push');
            // This is the ONLY place the OS permission prompt is triggered — iOS
            // asks once, so it has to be a deliberate action rather than
            // something that fires at app start.
            setPushState(await push.enablePushNotifications());
        } finally {
            setPushBusy(false);
        }
    }, []);

    const handleDisablePush = useCallback(async () => {
        setPushBusy(true);
        try {
            const push = await import('@/lib/native/push');
            await push.disablePushNotifications();
            setPushState(await push.getPushPermission());
        } finally {
            setPushBusy(false);
        }
    }, []);

    // ---- Account deletion ----
    const handleDelete = async () => {
        setDeleteError('');
        setDeleting(true);

        try {
            const response = await fetch('/api/user/delete-account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hasPassword ? { password } : {}),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setDeleteError(data.error || 'Could not schedule deletion. Please try again.');
                setDeleting(false);
                return;
            }

            // Sign out immediately. Signing back in reaches only the
            // cancellation screen (PendingDeletionGate), which is what makes
            // this read as deletion rather than deactivation to a reviewer.
            await signOut({ callbackUrl: '/?deletion=scheduled' });
        } catch {
            setDeleteError('Could not schedule deletion. Please try again.');
            setDeleting(false);
        }
    };

    // ---- WhatsApp Opt-in ----
    const handleToggleWhatsApp = async () => {
        if (!phone) {
            alert('Please add a phone number first to enable WhatsApp notifications.');
            return;
        }

        setWaBusy(true);
        const nextState = !waOptIn;
        try {
            const res = await fetch('/api/user/whatsapp-optin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optIn: nextState }),
            });
            if (res.ok) {
                setWaOptIn(nextState);
            } else {
                alert('Failed to update WhatsApp preferences.');
            }
        } catch (e) {
            alert('An error occurred.');
        } finally {
            setWaBusy(false);
        }
    };

    const memberSinceLabel = new Date(memberSince).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long',
    });

    return (
        <div className={styles.container}>
            <Link href="/dashboard" className={styles.backLink} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px', color: 'var(--accent-gold)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
                <ChevronLeft size={16} /> Back to Dashboard
            </Link>

            <header className={styles.header}>
                <span className="cosmic-label mb-2 block">Your Account</span>
                <h1 className="mystic-text text-4xl mb-4">Account Settings</h1>
                <div className="sacred-divider mb-8"></div>
            </header>

            <section className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Profile</h2>
                    {!isEditing ? (
                        <button onClick={() => setIsEditing(true)} className={styles.secondaryBtn} style={{ padding: '6px 12px', fontSize: '12px' }}>
                            <Edit2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Edit
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setIsEditing(false); setEditName(currentName || ''); setEditPhone(currentPhone || ''); }} className={styles.secondaryBtn} style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent' }} disabled={saveBusy}>
                                <X size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Cancel
                            </button>
                            <button onClick={handleSaveProfile} className={styles.primaryBtn} style={{ padding: '6px 12px', fontSize: '12px' }} disabled={saveBusy}>
                                <Save size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {saveBusy ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>
                <dl className={styles.detailList}>
                    <div className={styles.detailRow}>
                        <dt>Name</dt>
                        <dd>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={editName} 
                                    onChange={(e) => setEditName(e.target.value)} 
                                    className={styles.inputField} 
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--foreground)' }}
                                />
                            ) : (
                                currentName || <span className={styles.muted}>Not set</span>
                            )}
                        </dd>
                    </div>
                    <div className={styles.detailRow}>
                        <dt>Email</dt>
                        <dd>{email}</dd>
                    </div>
                    <div className={styles.detailRow}>
                        <dt>Phone</dt>
                        <dd>
                            {isEditing ? (
                                <input 
                                    type="tel" 
                                    value={editPhone} 
                                    onChange={(e) => setEditPhone(e.target.value)} 
                                    placeholder="+1234567890"
                                    className={styles.inputField} 
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--foreground)' }}
                                />
                            ) : (
                                currentPhone || <span className={styles.muted}>Not linked</span>
                            )}
                        </dd>
                    </div>
                    <div className={styles.detailRow}>
                        <dt>Member since</dt>
                        <dd>{memberSinceLabel}</dd>
                    </div>
                    <div className={styles.detailRow}>
                        <dt>Newsletter</dt>
                        <dd>{isSubscribed ? 'Subscribed' : 'Not subscribed'}</dd>
                    </div>
                </dl>
            </section>

            {/* Notifications only appear in the apps — there is no web push here. */}
            {isNative && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Push Notifications</h2>

                    {pushState === 'granted' && (
                        <>
                            <p className={styles.sectionText}>
                                Notifications are on. We&apos;ll let you know about timing shifts and
                                replies — never more than a few times a week.
                            </p>
                            <button
                                onClick={handleDisablePush}
                                className={styles.secondaryBtn}
                                disabled={pushBusy}
                            >
                                <BellOff size={16} />
                                {pushBusy ? 'Working…' : 'Turn Off Notifications'}
                            </button>
                        </>
                    )}

                    {pushState === 'prompt' && (
                        <>
                            <p className={styles.sectionText}>
                                Get notified about meaningful planetary timing shifts and replies to
                                your questions.
                            </p>
                            <button
                                onClick={handleEnablePush}
                                className={styles.secondaryBtn}
                                disabled={pushBusy}
                            >
                                <Bell size={16} />
                                {pushBusy ? 'Working…' : 'Turn On Notifications'}
                            </button>
                        </>
                    )}

                    {pushState === 'denied' && (
                        <p className={styles.sectionText}>
                            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            Notifications are blocked for AskChetna. To turn them back on, enable
                            them for AskChetna in your device&apos;s Settings app.
                        </p>
                    )}

                    {pushState === 'loading' && <p className={styles.sectionText}>Checking…</p>}
                </section>
            )}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>WhatsApp Notifications</h2>
                <p className={styles.sectionText}>
                    Receive appointment reminders and important daily planetary shifts directly on WhatsApp. 
                    {currentPhone ? ' We will send messages to your linked phone number.' : ' You must link a phone number first.'}
                </p>
                <button
                    onClick={handleToggleWhatsApp}
                    className={styles.secondaryBtn}
                    disabled={waBusy || !currentPhone}
                    style={{ opacity: (!currentPhone || waBusy) ? 0.5 : 1 }}
                >
                    {waBusy ? 'Working…' : waOptIn ? 'Disable WhatsApp Alerts' : 'Enable WhatsApp Alerts'}
                </button>
            </section>

            {/* Required in-app by App Store 5.1.1(v) and Google Play's data
                deletion policy. Must be reachable without contacting support. */}
            <section className={`${styles.section} ${styles.dangerSection}`}>
                <h2 className={styles.sectionTitle}>
                    <ShieldAlert size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Delete Account
                </h2>

                <p className={styles.sectionText}>
                    This permanently deletes your account and everything in it — birth profiles,
                    charts, journal entries, saved reports and any remaining credits. Unused
                    credits are not refundable.
                </p>
                <p className={styles.sectionText}>
                    You&apos;ll have <strong>7 days</strong> to change your mind by signing back in.
                    After that, nothing can be recovered.
                </p>

                {!confirmingDelete ? (
                    <button
                        onClick={() => setConfirmingDelete(true)}
                        className={styles.dangerBtn}
                    >
                        <Trash2 size={16} />
                        Delete My Account
                    </button>
                ) : (
                    <div className={styles.confirmBox}>
                        <p className={styles.confirmTitle}>Are you sure?</p>

                        {hasPassword && (
                            <div className={styles.formGroup}>
                                <label htmlFor="deleteConfirmPassword">
                                    Confirm your password to continue
                                </label>
                                <input
                                    id="deleteConfirmPassword"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {deleteError && (
                            <p className={styles.errorText}>
                                <AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                                {deleteError}
                            </p>
                        )}

                        <div className={styles.confirmActions}>
                            <button
                                onClick={handleDelete}
                                className={styles.dangerBtn}
                                disabled={deleting || (hasPassword && !password)}
                            >
                                {deleting ? 'Scheduling…' : 'Yes, Delete My Account'}
                            </button>
                            <button
                                onClick={() => { setConfirmingDelete(false); setDeleteError(''); setPassword(''); }}
                                className={styles.secondaryBtn}
                                disabled={deleting}
                            >
                                Keep My Account
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
