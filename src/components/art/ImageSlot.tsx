import Image from 'next/image';
import styles from './ImageSlot.module.css';

/**
 * A reserved space for artwork that may not exist yet.
 *
 * The layout work and the art sourcing run on different clocks, so every image
 * position on the site is declared as a slot with a known filename and aspect
 * ratio. Drop the file at `src` and pass it — nothing else changes. Until then
 * the slot renders an ornamental frame that holds the same space, so the page
 * never reflows when art lands and never looks broken if it ships without it.
 *
 * The filename hint is development-only: in production an empty slot reads as a
 * deliberate ornament rather than a missing asset.
 */

type Ratio = '1/1' | '4/3' | '3/4' | '16/9' | '3/2';

type ImageSlotProps = {
    /** Path under /public once the art exists, e.g. "/art/rashi/mesha.png". */
    src?: string;
    /** Required even for placeholders — writing it now stops it being forgotten. */
    alt: string;
    /** Where the file is expected to land. Shown in the dev placeholder. */
    slot: string;
    ratio?: Ratio;
    /** Rendered width hint for next/image. Height is derived from the ratio. */
    width?: number;
    priority?: boolean;
    className?: string;
};

const RATIO_HEIGHT: Record<Ratio, number> = {
    '1/1': 1,
    '4/3': 3 / 4,
    '3/4': 4 / 3,
    '16/9': 9 / 16,
    '3/2': 2 / 3,
};

export default function ImageSlot({
    src,
    alt,
    slot,
    ratio = '1/1',
    width = 600,
    priority = false,
    className = '',
}: ImageSlotProps) {
    const frame = `${styles.frame} ${className}`;

    if (src) {
        return (
            <div className={frame} style={{ aspectRatio: ratio }}>
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={Math.round(width * RATIO_HEIGHT[ratio])}
                    priority={priority}
                    className={styles.image}
                />
            </div>
        );
    }

    return (
        <div
            className={`${frame} ${styles.empty}`}
            style={{ aspectRatio: ratio }}
            /* Decorative until real art arrives — announcing "placeholder" to a
               screen reader is noise, and `alt` is already carried above. */
            role="presentation"
        >
            <span className={styles.mark} aria-hidden="true">
                ✦
            </span>
            {process.env.NODE_ENV !== 'production' && (
                <span className={styles.hint} aria-hidden="true">
                    {slot}
                </span>
            )}
        </div>
    );
}
