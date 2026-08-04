import Image from 'next/image';
import Link from 'next/link';
import styles from './HowItWorks.module.css';

/**
 * The three steps, told as illustrated collages rather than icon-and-caption
 * cards.
 *
 * Each row is four layers: the drawn plate, a data card overlapping its lower
 * corner, an ink arrow pointing into the card, and a row of botanical motifs
 * under the copy. The card carries a REAL artefact from the product — an
 * ascendant, a question, a daśā remainder — because a collage built out of
 * generic captions is decoration, and one built out of the thing the reader is
 * about to receive is a preview.
 *
 * Copy stays inside the positioning: nothing here promises an outcome or a
 * date. "Insight, not instruction" is the whole argument.
 */

type Step = {
    n: string;
    heading: string;
    sub: string;
    text: string;
    art: { src: string; alt: string };
    card: { key: string; value: string; note: string };
    href: string;
    cta: string;
    flip?: boolean;
};

const STEPS: Step[] = [
    {
        n: '1.',
        heading: 'Cast Your Chart',
        sub: 'Calculated, not guessed',
        text: 'Sidereal positions worked from your birth moment and place — the same mathematics a Jyotiṣī would do by hand, finished in a second.',
        art: {
            src: '/art/scenes/kundali-desk.png',
            alt: 'A kundali chart drawn on handmade paper beside a brass lamp',
        },
        card: {
            key: 'Ascendant',
            value: 'Meṣa 14°22′',
            note: 'Cast from your exact birth moment.',
        },
        href: '/chart',
        cta: 'See my chart',
    },
    {
        n: '2.',
        heading: 'Receive Your Reading',
        sub: 'Insight, not instruction',
        text: 'Bring the question that already keeps you up. You get the shape of the pattern and where your choice sits inside it — never a verdict, never a date on which your life is decided.',
        art: {
            src: '/art/scenes/journal-diya.png',
            alt: 'An open journal beside a burning diya',
        },
        card: {
            key: 'Your question',
            value: '“Why this, again?”',
            note: 'Observation, then pattern, then choice.',
        },
        href: '/clarity',
        cta: 'Ask Chetna',
        flip: true,
    },
    {
        n: '3.',
        heading: 'Cultivate Balance',
        sub: 'Return as the ground shifts',
        text: 'Daśā periods move over years, not days. Come back as your season changes — what looked unsupportive last spring may be ripening now.',
        art: {
            src: '/art/scenes/tulsi-constellation.png',
            alt: 'A tulsi plant whose stem becomes a constellation',
        },
        card: {
            key: 'Current daśā',
            value: 'Guru · 4y 2m left',
            note: 'Seasons turn slowly. Read it again.',
        },
        href: '/timing',
        cta: 'View your timeline',
    },
];

/** Trig rounded before it reaches an attribute, so the server and client
 *  render byte-identical strings. See Masthead.tsx. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** A hand-inked arrow, drawn rather than a glyph so it carries the same line
 *  quality as the illustrations it points into. */
function InkArrow() {
    return (
        <svg
            className={styles.arrow}
            viewBox="0 0 120 60"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M4 46 C 26 46, 44 40, 62 28 C 76 19, 90 14, 108 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <path
                d="M97 8 L109 14 L98 21"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Three botanical marks — lotus, tulsi leaf, marigold — repeated from the
 *  masthead's vocabulary so the band belongs to the same drawn world. */
function Motifs() {
    return (
        <div className={styles.motifs} aria-hidden="true">
            <svg className={styles.motif} viewBox="0 0 24 24" fill="none">
                <path
                    d="M12 4c2.6 2.4 3.9 5 3.9 8s-1.3 5.6-3.9 8c-2.6-2.4-3.9-5-3.9-8s1.3-5.6 3.9-8Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                />
                <path d="M12 6v14" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            <svg className={styles.motif} viewBox="0 0 24 24" fill="none">
                <path
                    d="M4 18c0-6 4.5-11 10.5-12C15.9 11.6 11.4 18 4 18Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                />
                <path d="M4 18C7 14 10.5 10.5 14.5 6" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            <svg className={styles.motif} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.1" />
                {Array.from({ length: 8 }, (_, i) => {
                    const a = (i / 8) * Math.PI * 2;
                    return (
                        <ellipse
                            key={i}
                            cx={r3(12 + Math.cos(a) * 6)}
                            cy={r3(12 + Math.sin(a) * 6)}
                            rx="2.6"
                            ry="1.7"
                            transform={`rotate(${(i / 8) * 360} ${r3(12 + Math.cos(a) * 6)} ${r3(12 + Math.sin(a) * 6)})`}
                            stroke="currentColor"
                            strokeWidth="0.9"
                        />
                    );
                })}
            </svg>
        </div>
    );
}

export default function HowItWorks() {
    return (
        <section className={styles.section} id="how-it-works">
            <div className={styles.inner}>
                <div className={styles.header}>
                    <span className="cosmic-label">❋ Vidhi · Method ❋</span>
                    <h2 className="mystic-text">How It Works</h2>
                    <div className="sacred-divider"></div>
                    <p className={styles.intro}>
                        Three steps, none of which ends in a prediction.
                    </p>
                </div>

                <div className={styles.steps}>
                    {STEPS.map((step) => (
                        <article
                            key={step.heading}
                            className={`${styles.step} ${step.flip ? styles.flip : ''}`}
                        >
                            <div className={styles.collage}>
                                <Image
                                    className={styles.illus}
                                    src={step.art.src}
                                    alt={step.art.alt}
                                    width={1024}
                                    height={1024}
                                    sizes="(max-width: 880px) 100vw, 520px"
                                />
                                <div className={styles.card}>
                                    <div className={styles.cardKey}>{step.card.key}</div>
                                    <div className={styles.cardValue}>{step.card.value}</div>
                                    <div className={styles.cardNote}>{step.card.note}</div>
                                </div>
                                <InkArrow />
                            </div>

                            <div>
                                <div className={styles.title}>
                                    <span className={styles.number}>{step.n}</span>
                                    <h3 className={styles.heading}>{step.heading}</h3>
                                </div>
                                <p className={styles.sub}>{step.sub}</p>
                                <p className={styles.text}>{step.text}</p>
                                <Motifs />
                                <Link href={step.href} className={styles.cta}>
                                    {step.cta} →
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
