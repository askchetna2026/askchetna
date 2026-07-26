'use client';

import { useEffect, useState } from 'react';
import { CURRENT_VERSION, checkForUpdates } from '@/lib/updates/versionManager';

interface VersionInfo {
  version: string;
  critical: boolean;
  changelog: string;
  releaseDate: string;
}

export default function VersionDebugPage() {
  const [isNative, setIsNative] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(CURRENT_VERSION);
  const [apiVersion, setApiVersion] = useState<VersionInfo | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null);
  const [userAgent, setUserAgent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        // Check if native app
        const isNativeApp = /AskChetnaApp/.test(navigator.userAgent);
        setIsNative(isNativeApp);
        setUserAgent(navigator.userAgent);
        setCurrentVersion(CURRENT_VERSION);

        // Fetch API version
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setApiVersion(data);
        } else {
          setError(`Failed to fetch /api/version: ${response.status}`);
        }

        // Check for updates
        const update = await checkForUpdates();
        setUpdateAvailable(update);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#D4AF37' }}>🔍 Version Debug Info</h1>

      {loading && <p style={{ color: '#DFE0FF' }}>Loading...</p>}
      {error && <p style={{ color: '#FF6B9D' }}>Error: {error}</p>}

      <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(18, 22, 64, 0.5)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <h2 style={{ color: '#D4AF37', marginTop: 0 }}>App Info</h2>
        <div style={{ color: '#DFE0FF' }}>
          <p>
            <strong>Is Native App:</strong> <span style={{ color: isNative ? '#4ECDC4' : '#FF6B9D' }}>{isNative ? 'YES ✅' : 'NO ❌'}</span>
          </p>
          <p>
            <strong>Current Version:</strong> <code style={{ background: '#0B0F2F', padding: '4px 8px', borderRadius: '4px' }}>{currentVersion}</code>
          </p>
          <p>
            <strong>User-Agent:</strong> <code style={{ background: '#0B0F2F', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>{userAgent}</code>
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(18, 22, 64, 0.5)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <h2 style={{ color: '#D4AF37', marginTop: 0 }}>/api/version Response</h2>
        {apiVersion ? (
          <div style={{ color: '#DFE0FF' }}>
            <p><strong>Version:</strong> {apiVersion.version}</p>
            <p><strong>Critical:</strong> {apiVersion.critical ? 'YES ⚠️' : 'NO'}</p>
            <p><strong>Release Date:</strong> {apiVersion.releaseDate}</p>
            <p><strong>Changelog:</strong> {apiVersion.changelog}</p>
          </div>
        ) : (
          <p style={{ color: '#FF6B9D' }}>No API response</p>
        )}
      </div>

      <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(18, 22, 64, 0.5)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <h2 style={{ color: '#D4AF37', marginTop: 0 }}>Update Status</h2>
        {updateAvailable ? (
          <div style={{ color: '#4ECDC4' }}>
            <p>✅ <strong>Update Available!</strong></p>
            <p><strong>New Version:</strong> {updateAvailable.version}</p>
            <p><strong>Changelog:</strong> {updateAvailable.changelog}</p>
          </div>
        ) : (
          <p style={{ color: '#DFE0FF' }}>
            {apiVersion ? `No update available (current: ${CURRENT_VERSION}, server: ${apiVersion.version})` : 'Could not check'}
          </p>
        )}
      </div>

      <div style={{ marginTop: '40px', padding: '16px', background: 'rgba(93, 63, 211, 0.1)', borderRadius: '8px', border: '1px solid rgba(93, 63, 211, 0.2)' }}>
        <h3 style={{ color: '#5D3FD3', marginTop: 0 }}>Troubleshooting</h3>
        <ul style={{ color: '#DFE0FF', fontSize: '14px' }}>
          <li>If "Is Native App" is NO: Check User-Agent string. APK needs to include "AskChetnaApp"</li>
          <li>If /api/version fails: Check network connection and that preview.askchetna.com is reachable</li>
          <li>If no update available: Versions match or API version is older. Check version numbers above.</li>
          <li>For UpdateNotification: Component only shows in native app if update is available</li>
        </ul>
      </div>
    </div>
  );
}
