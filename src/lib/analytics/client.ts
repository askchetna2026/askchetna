'use client';

import type { AnalyticsEventType } from '@/lib/analytics/events';

const VISITOR_ID_KEY = 'askchetna_visitor_id';

type TrackEventOptions = {
    path?: string;
    metadata?: Record<string, unknown>;
};

export function getVisitorId() {
    if (typeof window === 'undefined') {
        return null;
    }

    const existingId = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existingId) {
        return existingId;
    }

    const nextId =
        typeof window.crypto?.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(VISITOR_ID_KEY, nextId);
    return nextId;
}

export async function trackEvent(type: AnalyticsEventType, options: TrackEventOptions = {}) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const payload = {
            type,
            path: options.path || `${window.location.pathname}${window.location.search}`,
            visitorId: getVisitorId(),
            metadata: options.metadata || {},
        };

        await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        });
    } catch {
        // Analytics should never block the product experience.
    }
}
