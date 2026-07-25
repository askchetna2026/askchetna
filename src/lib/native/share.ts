'use client';

import { isClientNativeApp } from '@/lib/platform';

/**
 * Sharing that uses the real OS share sheet in the native apps.
 *
 * Why this exists: the site's share buttons call `navigator.share` with a
 * clipboard fallback. Android's WebView does NOT implement the Web Share API, so
 * inside the Android app every share silently degraded to "Copied to clipboard" —
 * losing the share sheet exactly where it matters most, on mobile.
 *
 * Order of preference:
 *   1. @capacitor/share    — native sheet (both apps)
 *   2. navigator.share     — real browsers, and iOS WKWebView which does support it
 *   3. clipboard           — desktop browsers
 *
 * Behind dynamic imports inside a native guard, so browsers download none of it.
 */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareRequest {
    title?: string;
    text: string;
    url?: string;
    /**
     * Optional image. On native it is written to a cache file first, because
     * @capacitor/share takes file URIs rather than Blobs.
     */
    file?: { blob: Blob; name: string };
}

/**
 * Share content, returning what actually happened so callers can show the right
 * confirmation ("Copied to clipboard" is a lie if the share sheet opened).
 */
export async function shareContent(request: ShareRequest): Promise<ShareOutcome> {
    if (isClientNativeApp()) {
        const outcome = await shareNative(request);
        // Fall through to the web path only if the native attempt errored, not
        // if the user deliberately dismissed the sheet.
        if (outcome !== 'failed') return outcome;
    }

    return shareWeb(request);
}

async function shareNative(request: ShareRequest): Promise<ShareOutcome> {
    try {
        const { Share } = await import('@capacitor/share');

        const files = request.file
            ? [await writeCacheFile(request.file.blob, request.file.name)]
            : undefined;

        await Share.share({
            title: request.title,
            text: request.text,
            url: request.url,
            dialogTitle: request.title,
            files,
        });

        return 'shared';
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Dismissing the sheet surfaces as an error on both platforms; it is not
        // a failure and must not trigger the clipboard fallback.
        if (/cancel|abort|dismiss/i.test(message)) return 'cancelled';

        console.warn('[share] native share failed, falling back:', message);
        return 'failed';
    }
}

/**
 * Persist a Blob to the cache directory and return a URI the share sheet can
 * attach. Cache (not Documents) so the OS can reclaim it — these are transient.
 */
async function writeCacheFile(blob: Blob, name: string): Promise<string> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    const base64 = await blobToBase64(blob);

    const { uri } = await Filesystem.writeFile({
        path: name,
        data: base64,
        directory: Directory.Cache,
    });

    return uri;
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read image data'));
        reader.onload = () => {
            const result = String(reader.result);
            // Filesystem wants raw base64, not the data: URL prefix.
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.readAsDataURL(blob);
    });
}

/** Browser path: Web Share API where available, clipboard otherwise. */
async function shareWeb(request: ShareRequest): Promise<ShareOutcome> {
    const shareText = request.url ? `${request.text}\n\n${request.url}` : request.text;

    try {
        if (request.file && navigator.canShare) {
            const file = new File([request.file.blob], request.file.name, { type: request.file.blob.type });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], text: request.text, title: request.title });
                return 'shared';
            }
        }

        if (navigator.share) {
            await navigator.share({ title: request.title, text: request.text, url: request.url });
            return 'shared';
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/cancel|abort/i.test(message)) return 'cancelled';
        // Any other failure still deserves the clipboard fallback.
    }

    try {
        await navigator.clipboard.writeText(shareText);
        return 'copied';
    } catch {
        return 'failed';
    }
}
