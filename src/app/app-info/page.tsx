'use client';

import { useEffect, useState } from 'react';
import {
  CURRENT_VERSION,
  checkForUpdates,
  fetchServerVersion,
  markAutoReloadAttempted,
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
    if (updateAvailable) markAutoReloadAttempted(updateAvailable.version);
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
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0B0F2F 0%, #1a1a4d 100%)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', color: '#DFE0FF' }}>
        {/* Back Button */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#D4AF37',
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
          <h1 style={{ fontSize: '32px', fontWeight: 600, margin: '0 0 8px 0', color: '#DFE0FF' }}>
            App Information
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(212, 175, 55, 0.8)', margin: 0 }}>
            Version details and updates
          </p>
        </div>

        {/* Current Version Card */}
        <div style={{
          padding: '24px',
          background: 'rgba(18, 22, 64, 0.6)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Version Info */}
            <div>
              <p style={{
                fontSize: '12px',
                color: 'rgba(212, 175, 55, 0.7)',
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
                color: '#D4AF37'
              }}>
                v{CURRENT_VERSION}
              </p>
            </div>

            {/* App Type */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
              <p style={{
                fontSize: '12px',
                color: 'rgba(212, 175, 55, 0.7)',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                App Type
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                {isNative ? (
                  <>
                    <span style={{ color: '#4ECDC4' }}>📱</span>
                    <span style={{ color: '#4ECDC4' }}>Native App</span>
                    <span style={{ color: '#4ECDC4', fontSize: '12px' }}>✓</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#DFE0FF' }}>🌐</span>
                    <span style={{ color: '#DFE0FF' }}>Web Browser</span>
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
            background: 'rgba(78, 205, 196, 0.1)',
            border: '2px solid rgba(78, 205, 196, 0.4)',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{
                fontSize: '16px',
                color: '#4ECDC4',
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
                color: 'rgba(78, 205, 196, 0.9)',
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
              borderTop: '1px solid rgba(78, 205, 196, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(78, 205, 196, 0.7)' }}>New Version:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>v{updateAvailable.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(78, 205, 196, 0.7)' }}>Released:</span>
                <span>{new Date(updateAvailable.releaseDate).toLocaleDateString()}</span>
              </div>
              {updateAvailable.critical && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderTop: '1px solid rgba(78, 205, 196, 0.2)'
                }}>
                  <span style={{ color: 'rgba(78, 205, 196, 0.7)' }}>Priority:</span>
                  <span style={{ color: '#FF6B9D', fontWeight: 600 }}>⚠️ Critical</span>
                </div>
              )}
            </div>

            <button
              onClick={handleUpdate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: updateAvailable.critical
                  ? 'linear-gradient(135deg, #FF6B9D 0%, #FF5580 100%)'
                  : 'linear-gradient(135deg, #4ECDC4 0%, #45B7AA 100%)',
                color: '#0B0F2F',
                border: 'none',
                borderRadius: '8px',
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
            background: 'rgba(78, 205, 196, 0.05)',
            border: '1px solid rgba(78, 205, 196, 0.2)',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: 'rgba(78, 205, 196, 0.9)', fontSize: '14px' }}>
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
              background: 'rgba(93, 63, 211, 0.2)',
              color: '#5D3FD3',
              border: '1px solid rgba(93, 63, 211, 0.4)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'rgba(93, 63, 211, 0.3)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(93, 63, 211, 0.2)')}
          >
            {loading ? '⟳ Checking for updates...' : '⟳ Check for Updates'}
          </button>
          {lastChecked && (
            <p style={{
              fontSize: '12px',
              color: 'rgba(212, 175, 55, 0.5)',
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
            background: 'rgba(18, 22, 64, 0.4)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <p style={{
              fontSize: '12px',
              color: 'rgba(212, 175, 55, 0.6)',
              margin: '0 0 12px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Server Info
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(212, 175, 55, 0.6)' }}>Latest:</span>
                <span style={{ fontFamily: 'monospace', color: '#DFE0FF' }}>v{apiVersion.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(212, 175, 55, 0.6)' }}>Status:</span>
                <span style={{ color: '#4ECDC4' }}>Online ✓</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div style={{
          padding: '16px',
          background: 'rgba(93, 63, 211, 0.05)',
          border: '1px solid rgba(93, 63, 211, 0.15)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(212, 175, 55, 0.6)',
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
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(212, 175, 55, 0.7)',
          lineHeight: '1.6'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#D4AF37' }}>Privacy & Updates</h3>
          <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              Update checks do <strong>not</strong> transmit personal data. Only your app version is compared with the server.
            </li>
            <li style={{ marginBottom: '8px' }}>
              For complete privacy details, see our <a href="/privacy" style={{ color: '#D4AF37', textDecoration: 'underline' }}>Privacy Policy</a>.
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
