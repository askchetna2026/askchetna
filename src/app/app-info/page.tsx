'use client';

import { useEffect, useState } from 'react';
import {
  CURRENT_VERSION,
  checkForUpdates,
  fetchServerVersion,
  isCriticalUpdate,
  markAutoReloadAttempted,
  updateKey,
} from '@/lib/updates/versionManager';
import Link from 'next/link';

interface VersionInfo {
  version: string;
  critical: boolean;
  changelog: string;
  releaseDate: string;
}

export default function AppInfoPage() {
  const [isNative, setIsNative] = useState(false);
  const [apiVersion, setApiVersion] = useState<VersionInfo | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        const isNativeApp = /AskChetnaApp/.test(navigator.userAgent);
        setIsNative(isNativeApp);

        setApiVersion(await fetchServerVersion());

        const update = await checkForUpdates();
        setUpdateAvailable(update);
        setLastChecked(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Error checking version:', err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const handleUpdate = () => {
    // Claim the guard so the background auto-reload doesn't fire a second time
    // for this same version once the page comes back.
    if (updateAvailable) markAutoReloadAttempted(updateKey(updateAvailable));
    window.location.reload();
  };

  const handleCheckNow = async () => {
    setLoading(true);
    try {
      setApiVersion(await fetchServerVersion());
      setUpdateAvailable(await checkForUpdates());
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error checking updates:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', color: 'var(--foreground)' }}>
        {/* Back Button */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: 'var(--accent-gold)',
            textDecoration: 'none',
            marginBottom: '32px',
            transition: 'gap 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.gap = '12px')}
          onMouseLeave={(e) => (e.currentTarget.style.gap = '8px')}
        >
          ← Back
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--foreground)' }}>
            App Information
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--accent-gold-text)', margin: 0 }}>
            Version details and updates
          </p>
        </div>

        {/* Current Version Card */}
        <div style={{
          padding: '24px',
          background: 'rgba(var(--bg-soft-rgb), 0.6)',
          border: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Version Info */}
            <div>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Current Version
              </p>
              <p style={{
                fontSize: '28px',
                fontWeight: 600,
                margin: 0,
                fontFamily: 'monospace',
                color: 'var(--accent-gold)'
              }}>
                v{CURRENT_VERSION}
              </p>
            </div>

            {/* App Type */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                App Type
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                {isNative ? (
                  <>
                    <span style={{ color: 'var(--success)' }}>📱</span>
                    <span style={{ color: 'var(--success)' }}>Native App</span>
                    <span style={{ color: 'var(--success)', fontSize: '12px' }}>✓</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--foreground)' }}>🌐</span>
                    <span style={{ color: 'var(--foreground)' }}>Web Browser</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Update Status Card */}
        {updateAvailable && (
          <div style={{
            padding: '24px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{
                fontSize: '16px',
                color: 'var(--success)',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✨</span> Update Available
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'var(--success)',
                margin: 0,
                lineHeight: '1.6'
              }}>
                {updateAvailable.changelog}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '12px',
              fontSize: '13px',
              marginBottom: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--card-border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>New Version:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>v{updateAvailable.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Released:</span>
                <span>{new Date(updateAvailable.releaseDate).toLocaleDateString()}</span>
              </div>
              {isCriticalUpdate(updateAvailable) && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderTop: '1px solid var(--card-border)'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Priority:</span>
                  <span style={{ color: 'var(--error)', fontWeight: 600 }}>⚠️ Critical</span>
                </div>
              )}
            </div>

            <button
              onClick={handleUpdate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: isCriticalUpdate(updateAvailable)
                  ? 'linear-gradient(135deg, var(--error) 0%, var(--error) 100%)'
                  : 'linear-gradient(135deg, var(--success) 0%, var(--success) 100%)',
                color: 'var(--background)',
                border: 'none',
                borderRadius: 'var(--radius-xs)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'Updating...' : 'Update Now'}
            </button>
          </div>
        )}

        {!updateAvailable && !loading && (
          <div style={{
            padding: '24px',
            background: 'var(--success-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: 'var(--success)', fontSize: '14px' }}>
              ✅ You're on the latest version
            </p>
          </div>
        )}

        {/* Check Button */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleCheckNow}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(74, 47, 168, 0.2)',
              color: 'var(--accent-iris)',
              border: '1px solid rgba(74, 47, 168, 0.4)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'rgba(74, 47, 168, 0.3)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(74, 47, 168, 0.2)')}
          >
            {loading ? '⟳ Checking for updates...' : '⟳ Check for Updates'}
          </button>
          {lastChecked && (
            <p style={{
              fontSize: '12px',
              color: 'rgba(var(--accent-gold-rgb), 0.5)',
              margin: '8px 0 0 0',
              textAlign: 'center'
            }}>
              Last checked: {lastChecked}
            </p>
          )}
        </div>

        {/* Server Info */}
        {apiVersion && (
          <div style={{
            padding: '20px',
            background: 'rgba(var(--bg-soft-rgb), 0.4)',
            border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
            borderRadius: 'var(--radius-xs)',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '0 0 12px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Server Info
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Latest:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--foreground)' }}>v{apiVersion.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: 'var(--success)' }}>Online ✓</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div style={{
          padding: '16px',
          background: 'rgba(74, 47, 168, 0.05)',
          border: '1px solid rgba(74, 47, 168, 0.15)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>In the app:</strong> the latest version loads every time you open AskChetna, so there is nothing to install. If an update is released while you are still using the app, it applies on its own the next time you switch back.
          </p>
          <p style={{ margin: 0 }}>
            <strong>In a browser:</strong> the latest version loads when you refresh the page.
          </p>
        </div>

        {/* Privacy & Disclaimer */}
        <div style={{
          padding: '16px',
          background: 'rgba(var(--accent-gold-rgb), 0.05)',
          border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          lineHeight: '1.6'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--accent-gold)' }}>Privacy & Updates</h3>
          <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              Update checks do <strong>not</strong> transmit personal data. Only your app version is compared with the server.
            </li>
            <li style={{ marginBottom: '8px' }}>
              For complete privacy details, see our <a href="/privacy" style={{ color: 'var(--accent-gold)', textDecoration: 'underline' }}>Privacy Policy</a>.
            </li>
            <li>
              Updates need an internet connection. They apply on their own, but never while you are in the middle of something — only once the app is in the background or you return to it.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
