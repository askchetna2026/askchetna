import { describe, it, expect } from 'vitest';
import { photoVersion, photoPointer } from './astrologerPhoto';

/**
 * The version is what makes a replaced portrait visible to everyone else rather
 * than only to the astrologer who uploaded it. If it stops changing when the
 * photo does, the bug is silent — the page simply keeps showing the old face.
 */

describe('photoVersion', () => {
    it('takes the filename stem, which is the upload timestamp', () => {
        expect(photoVersion('published/abc123/1786020563231.webp')).toBe('1786020563231');
    });

    it('handles an application-sourced path the same way', () => {
        expect(photoVersion('cms5yl2go000s13jjw9cb8pue/1785818745502.webp')).toBe('1785818745502');
    });

    it('is null when there is no photo, so callers can fall back to an initial', () => {
        expect(photoVersion(null)).toBeNull();
        expect(photoVersion(undefined)).toBeNull();
        expect(photoVersion('')).toBeNull();
    });

    it('changes when the photo changes', () => {
        const before = photoVersion('published/abc/1000.webp');
        const after = photoVersion('published/abc/2000.webp');
        expect(after).not.toBe(before);
    });

    it('does NOT change when the photo has not', () => {
        // The cache is meant to keep hitting for an unchanged portrait; a
        // version that moved on every call would throw that away.
        expect(photoVersion('published/abc/1000.webp'))
            .toBe(photoVersion('published/abc/1000.webp'));
    });
});

describe('photoPointer', () => {
    it('builds a versioned pointer at the serving route', () => {
        expect(photoPointer('astro1', 'published/astro1/1786020563231.webp'))
            .toBe('/api/astrologers/astro1/photo?v=1786020563231');
    });

    it('gives two different URLs for two different photos of the same astrologer', () => {
        const a = photoPointer('astro1', 'published/astro1/1000.webp');
        const b = photoPointer('astro1', 'published/astro1/2000.webp');
        expect(a).not.toBe(b);
    });

    it('returns null with no photo, rather than a URL that would 404', () => {
        expect(photoPointer('astro1', null)).toBeNull();
    });
});
