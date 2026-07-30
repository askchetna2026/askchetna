'use client';

import { useState } from 'react';
import styles from './AstrologerAvatar.module.css';

/**
 * An astrologer's portrait, with a fallback that is never empty.
 *
 * Two things make the fallback load-bearing rather than decorative:
 *
 *   - Most astrologers have no photo. `photoUrl` is null for every AI persona
 *     that has not been given art and for every human whose profile predates
 *     one, and a card with a hole in it looks broken rather than incomplete.
 *   - Human photos are served from a PRIVATE bucket via short-lived signed URLs
 *     (see `src/lib/photoUpload.ts`). Those expire by design, so a URL that
 *     worked when the page rendered can 403 while the tab sits open. `onError`
 *     is what stops that showing as a torn-image icon.
 *
 * Plain `<img>` rather than `next/image`: the source is either a local asset or
 * a Supabase signed URL whose host varies per environment, and configuring
 * `remotePatterns` for three projects to gain optimisation on one 28 KB square
 * is not a trade worth making.
 */

/** Deterministic hue so an astrologer's initial keeps the same colour. */
function hueFor(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    return hash;
}

export default function AstrologerAvatar({
    name,
    photoUrl,
    size = 64,
}: {
    name: string;
    photoUrl: string | null;
    size?: number;
}) {
    const [failed, setFailed] = useState(false);
    const showPhoto = Boolean(photoUrl) && !failed;

    return (
        <div
            className={styles.avatar}
            style={{ width: size, height: size }}
            // Decorative: the name is always rendered next to it, and a second
            // announcement of it is noise to a screen reader.
            aria-hidden="true"
        >
            {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={photoUrl as string}
                    alt=""
                    width={size}
                    height={size}
                    loading="lazy"
                    decoding="async"
                    className={styles.photo}
                    onError={() => setFailed(true)}
                />
            ) : (
                <span
                    className={styles.initial}
                    style={{
                        fontSize: Math.round(size * 0.42),
                        background: `linear-gradient(140deg,
                            hsl(${hueFor(name)} 42% 26%),
                            hsl(${(hueFor(name) + 40) % 360} 38% 16%))`,
                    }}
                >
                    {name.trim().charAt(0).toUpperCase() || '?'}
                </span>
            )}
        </div>
    );
}
