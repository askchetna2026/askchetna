import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/site';

export type SeoLandingBenefit = {
    title: string;
    description: string;
};

export type SeoLandingSection = {
    title: string;
    body: string;
};

export type SeoLandingFaq = {
    question: string;
    answer: string;
};

export type SeoLandingLink = {
    title: string;
    description: string;
    href: string;
};

export type SeoLandingPage = {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    heroTitle: string;
    heroDescription: string;
    primaryCta: {
        label: string;
        href: string;
        /**
         * What the button says to someone already signed in.
         *
         * Required rather than optional: every page needs a considered answer,
         * and an optional field would have let the next page added quietly go
         * back to inviting existing users to sign up.
         */
        signedInLabel: string;
    };
    secondaryCta: {
        label: string;
        href: string;
    };
    proofPoints: string[];
    benefits: SeoLandingBenefit[];
    sections: SeoLandingSection[];
    faq: SeoLandingFaq[];
    internalLinks: SeoLandingLink[];
    newsletterSource: string;
};

export const SEO_LANDING_PAGES: Record<string, SeoLandingPage> = {
    'ai-astrologer': {
        slug: 'ai-astrologer',
        metaTitle: 'AI Astrologer for Reflection, Not Prediction | AskChetna',
        metaDescription:
            'Use an AI astrologer that explains patterns, timing, and emotional dynamics through Vedic astrology without fear-based prediction.',
        eyebrow: 'AI Astrology, Grounded',
        heroTitle: 'An AI astrologer that helps you understand patterns, not outsource your choices',
        heroDescription:
            'AskChetna blends Vedic astrology with reflective AI guidance so questions about love, timing, work, and inner patterns become clearer and more actionable.',
        primaryCta: {
            label: 'Sign Up and Ask a Question',
            href: '/login?mode=signup&callbackUrl=/clarity',
            signedInLabel: 'Ask a Question',
        },
        secondaryCta: {
            label: 'See How Clarity Works',
            href: '/clarity',
        },
        proofPoints: [
            'Awareness-first astrology with no fear tactics',
            'Built for career, relationship, and timing questions',
            'Starts with a free signup credit bonus',
        ],
        benefits: [
            {
                title: 'Ask specific life questions',
                description: 'Bring real dilemmas instead of generic horoscope prompts and get chart-aware reflections that stay anchored in context.',
            },
            {
                title: 'Use astrology without dependency',
                description: 'The product is designed to clarify patterns and options, not to create ritual dependence or false certainty.',
            },
            {
                title: 'Move from insight to action',
                description: 'Each response is structured around observations, the pattern beneath the issue, and practical next steps you can test immediately.',
            },
        ],
        sections: [
            {
                title: 'Why people look for an AI astrologer',
                body: 'Most seekers are not looking for abstract symbolism. They want help naming why the same relationship loop, career fear, or timing doubt keeps repeating. AskChetna uses your chart as a map for that reflection.',
            },
            {
                title: 'What makes AskChetna different',
                body: 'Instead of promising exact outcomes, we focus on pattern recognition. You can ask about conflict, procrastination, transitions, and emotional habits while keeping free will at the center of the process.',
            },
            {
                title: 'Where to start',
                body: 'If your question is emotional or psychological, begin in Clarity. If it is about planetary timing, go to the Dasha timeline. If it is about compatibility, explore synastry from the same account.',
            },
        ],
        faq: [
            {
                question: 'Is this an AI astrologer or a human reading service?',
                answer: 'AskChetna is an AI-guided astrology product. It is built to explain patterns and support self-awareness using your chart data.',
            },
            {
                question: 'Can I ask about relationships, work, and timing?',
                answer: 'Yes. The strongest use cases are relationship patterns, career decision friction, emotional themes, and timing questions through Dasha periods.',
            },
            {
                question: 'Does AskChetna predict the future?',
                answer: 'No. The product is intentionally framed around awareness, pattern recognition, and responsibility rather than deterministic prediction.',
            },
        ],
        internalLinks: [
            {
                title: 'Relationship Astrology',
                description: 'See how chart patterns can illuminate attraction, attachment, and conflict loops.',
                href: '/relationship-astrology',
            },
            {
                title: 'Career Astrology',
                description: 'Explore how timing and chart dynamics affect work direction, ambition, and reinvention.',
                href: '/career-astrology',
            },
            {
                title: 'Dasha Timeline',
                description: 'Understand planetary periods as seasons of effort, closure, and growth.',
                href: '/dasha-timeline',
            },
        ],
        newsletterSource: 'landing_ai_astrologer',
    },
    'relationship-astrology': {
        slug: 'relationship-astrology',
        metaTitle: 'Relationship Astrology for Patterns in Love | AskChetna',
        metaDescription:
            'Explore relationship astrology through attachment patterns, conflict triggers, compatibility dynamics, and Vedic timing without fear-based predictions.',
        eyebrow: 'Love and Pattern Awareness',
        heroTitle: 'Relationship astrology that helps you understand the pattern, not chase a verdict',
        heroDescription:
            'Use your chart to reflect on attraction, emotional distance, trust, recurring conflict, and compatibility themes through a calmer Vedic lens.',
        primaryCta: {
            label: 'Sign Up for Relationship Insight',
            href: '/login?mode=signup&callbackUrl=/synastry',
            signedInLabel: 'Compare Two Charts',
        },
        secondaryCta: {
            label: 'Explore Compatibility',
            href: '/synastry',
        },
        proofPoints: [
            'Useful for attraction patterns and recurring conflict',
            'Compatibility framed as awareness, not a score alone',
            'Grounded in Vedic chart symbolism and timing',
        ],
        benefits: [
            {
                title: 'Spot your repeating loop',
                description: 'Relationship astrology becomes more useful when it helps you name what keeps repeating, especially around distance, pursuit, defensiveness, or silence.',
            },
            {
                title: 'Understand emotional triggers',
                description: 'Chart placements can reveal how you process vulnerability, how you protect yourself, and what tends to activate fear inside connection.',
            },
            {
                title: 'Use compatibility more maturely',
                description: 'Instead of asking only whether two people match, AskChetna helps surface communication style, friction points, and where growth is required.',
            },
        ],
        sections: [
            {
                title: 'What relationship astrology can actually clarify',
                body: 'It can clarify why you pull away when intimacy deepens, why you are drawn to a certain emotional dynamic, or why a relationship looks stable on the surface but feels draining underneath.',
            },
            {
                title: 'Why prediction is not enough',
                body: 'A simple yes or no about whether a relationship will last does not help much. It is more useful to see what dynamic is being activated, what responsibility belongs to you, and how timing is shaping the present season.',
            },
            {
                title: 'How to use this page',
                body: 'Begin with a compatibility question, then move into Clarity if you want a more personal reflection on your part in the pattern.',
            },
        ],
        faq: [
            {
                question: 'Can relationship astrology tell me if someone is my soulmate?',
                answer: 'AskChetna is not built around soulmate certainty. It is better at showing the pattern, the attraction, and the work a bond may require.',
            },
            {
                question: 'Does compatibility mean the relationship will work?',
                answer: 'Compatibility can show ease and friction, but conscious effort, maturity, and timing still matter. The product treats astrology as guidance, not guarantee.',
            },
            {
                question: 'Can I use this even if I am single?',
                answer: 'Yes. Many people use relationship astrology to understand why similar dynamics repeat before entering a new relationship.',
            },
        ],
        internalLinks: [
            {
                title: 'AI Astrologer',
                description: 'Ask broader questions about emotional habits and recurring life patterns.',
                href: '/ai-astrologer',
            },
            {
                title: 'Dasha Timeline',
                description: 'See whether your current period is emphasizing bonding, detachment, responsibility, or healing.',
                href: '/dasha-timeline',
            },
            {
                title: 'How AskChetna Works',
                description: 'Read the awareness-first framework behind the product.',
                // /how-it-works now 301s here; linking straight to the
                // destination saves the hop.
                href: '/explore',
            },
        ],
        newsletterSource: 'landing_relationship_astrology',
    },
    'career-astrology': {
        slug: 'career-astrology',
        metaTitle: 'Career Astrology for Work Patterns and Timing | AskChetna',
        metaDescription:
            'Use career astrology to reflect on direction, ambition, burnout, reinvention, and decision timing through Vedic chart analysis and AI guidance.',
        eyebrow: 'Career Clarity Through Timing',
        heroTitle: 'Career astrology for the moments when work feels heavy, unclear, or ready to change',
        heroDescription:
            'AskChetna helps you explore ambition, stagnation, reinvention, burnout, and timing through your chart so career choices feel more deliberate and less reactive.',
        primaryCta: {
            label: 'Sign Up for Career Clarity',
            href: '/login?mode=signup&callbackUrl=/clarity',
            signedInLabel: 'Ask About Your Work',
        },
        secondaryCta: {
            label: 'Ask a Career Question',
            href: '/clarity',
        },
        proofPoints: [
            'Useful for work transitions and career uncertainty',
            'Timing-aware reflections through Dasha periods',
            'Built to support choice, not fatalism',
        ],
        benefits: [
            {
                title: 'Understand work friction',
                description: 'Use your chart to reflect on overwork, delay, fear of visibility, confusion around calling, or the pressure to keep proving yourself.',
            },
            {
                title: 'Read career timing more clearly',
                description: 'Some seasons call for discipline, others for experimentation, closure, recovery, or quieter skill-building. The chart helps frame that context.',
            },
            {
                title: 'Make better questions',
                description: 'Instead of asking only whether to quit, you can ask what pattern is creating exhaustion, what role fits your temperament, or what timing is amplifying pressure.',
            },
        ],
        sections: [
            {
                title: 'When career astrology is most useful',
                body: 'Career astrology helps most when you are between paths, feeling chronically blocked, losing interest in your current role, or trying to understand why the same work tension keeps returning.',
            },
            {
                title: 'From destiny language to pattern language',
                body: 'Rather than framing your career as a fixed fate, AskChetna treats the chart as a pattern map. That makes it easier to see where you can adapt, wait, commit, or change direction with less self-judgment.',
            },
            {
                title: 'Use timing without panic',
                body: 'Planetary periods can add pressure, momentum, discipline, or uncertainty. Seeing that context can help you choose a smarter pace rather than forcing a decision from fear.',
            },
        ],
        faq: [
            {
                question: 'Can career astrology tell me the perfect profession?',
                answer: 'It is more realistic to use it for themes, strengths, friction points, and timing than to expect a single fixed profession.',
            },
            {
                question: 'Is this useful if I feel burned out?',
                answer: 'Yes. Burnout questions often become clearer when you can separate a timing phase, a personality pattern, and an environment mismatch.',
            },
            {
                question: 'Should I ask about switching jobs or starting a business?',
                answer: 'Yes. Those are strong use cases, especially when paired with questions about why the move feels urgent, blocked, or emotionally loaded.',
            },
        ],
        internalLinks: [
            {
                title: 'Dasha Timeline',
                description: 'Pair career questions with a clearer sense of the planetary season you are in.',
                href: '/dasha-timeline',
            },
            {
                title: 'AI Astrologer',
                description: 'Use the general reflection flow for deeper personal questions behind work stress.',
                href: '/ai-astrologer',
            },
            {
                title: 'Blog',
                description: 'Read longer-form guidance on chart timing and life patterns.',
                href: '/blog',
            },
        ],
        newsletterSource: 'landing_career_astrology',
    },
    'dasha-timeline': {
        slug: 'dasha-timeline',
        metaTitle: 'Dasha Timeline Meaning in Vedic Astrology | AskChetna',
        metaDescription:
            'Understand what a Dasha timeline means in Vedic astrology and how planetary periods shape pacing, growth, challenge, and decision timing.',
        eyebrow: 'Timing Without Fear',
        heroTitle: 'A Dasha timeline can show the season you are in, not just the event you are waiting for',
        heroDescription:
            'AskChetna uses Vimsottari Dasha timing to help you reflect on what your current planetary period is emphasizing and how to work with that season more consciously.',
        primaryCta: {
            label: 'Sign Up to View Your Timeline',
            href: '/login?mode=signup&callbackUrl=/timing',
            signedInLabel: 'Open Your Timeline',
        },
        secondaryCta: {
            label: 'Explore Timing',
            href: '/timing',
        },
        proofPoints: [
            'Vimsottari Dasha framed as seasons, not superstition',
            'Useful for transitions, delays, endings, and momentum',
            'Connected to Clarity and chart exploration in one account',
        ],
        benefits: [
            {
                title: 'See the season beneath the event',
                description: 'Timing becomes more useful when it tells you what kind of growth, pressure, or closure is being emphasized rather than promising a simple outcome.',
            },
            {
                title: 'Reduce impatience and mis-timing',
                description: 'When you understand the planetary season, you can avoid forcing the wrong move at the wrong pace and respond with more precision.',
            },
            {
                title: 'Connect timing with real life choices',
                description: 'A Dasha period becomes practical when it is tied to decisions about relationships, work, recovery, and responsibility in the present.',
            },
        ],
        sections: [
            {
                title: 'What a Dasha timeline is',
                body: 'In Vedic astrology, Dashas are planetary periods that describe broader life chapters. They do not remove free will, but they can show which themes are becoming louder right now.',
            },
            {
                title: 'How AskChetna approaches timing',
                body: 'We translate timing into grounded language: pressure, rest, effort, visibility, detachment, study, rebuilding, or closure. That keeps the interpretation psychologically useful.',
            },
            {
                title: 'How to use your timeline well',
                body: 'Do not treat a Dasha like a verdict. Use it as context. A heavier phase can still be productive, and an expansive phase still requires responsibility and pacing.',
            },
        ],
        faq: [
            {
                question: 'Does a difficult Dasha mean bad things will happen?',
                answer: 'No. A difficult period may emphasize responsibility, contraction, or emotional work, but it does not guarantee a specific negative outcome.',
            },
            {
                question: 'Can a Dasha timeline help with career or relationship decisions?',
                answer: 'Yes. Timing is especially useful when paired with a concrete question about whether this is a season for building, waiting, repairing, or releasing.',
            },
            {
                question: 'What if I do not know my exact birth time?',
                answer: 'Precise timing works best with accurate birth data. If your birth time is uncertain, start by refining the chart details first.',
            },
        ],
        internalLinks: [
            {
                title: 'Career Astrology',
                description: 'Use timing insights to make work decisions with more context and less panic.',
                href: '/career-astrology',
            },
            {
                title: 'Relationship Astrology',
                description: 'See how timing and emotional patterning can intersect inside close bonds.',
                href: '/relationship-astrology',
            },
            {
                title: 'Chart Page',
                description: 'Explore the broader chart context behind your timing periods.',
                href: '/chart',
            },
        ],
        newsletterSource: 'landing_dasha_timeline',
    },
};

export const HOME_TOPIC_LINKS = [
    {
        href: '/ai-astrologer',
        title: 'AI Astrologer',
        description: 'For people searching for chart-aware reflection without fear-based prediction.',
    },
    {
        href: '/relationship-astrology',
        title: 'Relationship Astrology',
        description: 'Understand attraction, recurring conflict, compatibility, and emotional triggers.',
    },
    {
        href: '/career-astrology',
        title: 'Career Astrology',
        description: 'Reflect on direction, burnout, ambition, reinvention, and work timing.',
    },
    {
        href: '/dasha-timeline',
        title: 'Dasha Timeline',
        description: 'Learn what your current planetary period may be asking from this chapter of life.',
    },
];

export function buildSeoLandingMetadata(page: SeoLandingPage): Metadata {
    const path = `/${page.slug}`;

    return {
        title: page.metaTitle,
        description: page.metaDescription,
        keywords: [
            'vedic astrology',
            'astrology for awareness',
            page.slug.replace(/-/g, ' '),
            page.heroTitle,
        ],
        alternates: {
            canonical: path,
        },
        openGraph: {
            title: page.metaTitle,
            description: page.metaDescription,
            url: absoluteUrl(path),
            siteName: SITE_NAME,
            type: 'article',
            images: [
                {
                    url: absoluteUrl('/opengraph-image'),
                    width: 1200,
                    height: 630,
                    alt: page.metaTitle,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: page.metaTitle,
            description: page.metaDescription,
            images: [absoluteUrl('/opengraph-image')],
        },
    };
}
