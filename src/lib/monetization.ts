export type MonetizationIntent =
    | 'clarity'
    | 'chart_unlock'
    | 'report'
    | 'profile_expansion'
    | 'top_up';

type PricingUrlOptions = {
    intent: MonetizationIntent;
    source?: string;
    returnTo?: string | null;
    focus?: string | null;
};

type PricingContext = {
    badge: string;
    title: string;
    description: string;
    recommendation: string;
};

const DEFAULT_RETURN_PATHS: Record<MonetizationIntent, string> = {
    clarity: '/clarity',
    chart_unlock: '/chart',
    report: '/dashboard',
    profile_expansion: '/dashboard',
    top_up: '/dashboard',
};

const PRICING_CONTEXTS: Record<MonetizationIntent, PricingContext> = {
    clarity: {
        badge: 'Keep Your Momentum',
        title: 'Stay with the question while the pattern is still fresh',
        description: 'A small top-up gives you room for follow-up questions, deeper timing checks, and clearer next steps.',
        recommendation: 'Most seekers start with a pack that covers a few follow-up reflections.',
    },
    chart_unlock: {
        badge: 'Deeper Chart Access',
        title: 'Unlock the next layer of your chart without breaking flow',
        description: 'Top up once, then return to your chart and keep opening the divisional views that matter most.',
        recommendation: 'A mid-sized pack usually covers several premium chart unlocks in one session.',
    },
    report: {
        badge: 'Premium Report Prep',
        title: 'Top up for your full life report',
        description: 'Credits never expire, so you can add them now and unlock your premium report when you are ready to go deep.',
        recommendation: 'If you plan to explore reports and follow-up questions, larger packs reduce repeat checkout friction.',
    },
    profile_expansion: {
        badge: 'More Profile Room',
        title: 'Add credits before expanding your profile capacity',
        description: 'If you manage charts for family, clients, or multiple life stages, topping up now keeps that workflow smooth.',
        recommendation: 'A larger pack tends to make sense when you expect repeated profile expansions or chart unlocks.',
    },
    top_up: {
        badge: 'Flexible Top-Up',
        title: 'Choose the pack that matches how deeply you want to explore',
        description: 'AskChetna is designed for pay-as-you-go clarity, so you can top up only when the next layer of insight is worth it.',
        recommendation: 'Credits never expire, which makes larger packs easier to use over time.',
    },
};

export function isMonetizationIntent(value: string | null): value is MonetizationIntent {
    return value === 'clarity'
        || value === 'chart_unlock'
        || value === 'report'
        || value === 'profile_expansion'
        || value === 'top_up';
}

export function sanitizeInternalReturnTo(returnTo?: string | null) {
    if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
        return null;
    }

    return returnTo;
}

export function buildPricingUrl(options: PricingUrlOptions) {
    const params = new URLSearchParams();
    params.set('intent', options.intent);

    if (options.source) {
        params.set('source', options.source);
    }

    const safeReturnTo = sanitizeInternalReturnTo(options.returnTo);
    if (safeReturnTo) {
        params.set('returnTo', safeReturnTo);
    }

    if (options.focus) {
        params.set('focus', options.focus);
    }

    return `/pricing?${params.toString()}`;
}

export function getPricingContext(intent: MonetizationIntent, focus?: string | null) {
    const context = PRICING_CONTEXTS[intent];

    if (!focus) {
        return context;
    }

    if (intent === 'chart_unlock') {
        return {
            ...context,
            description: `Top up once, then come back and unlock ${focus} along with the other premium chart views you want to explore.`,
        };
    }

    return context;
}

export function resolvePostPurchasePath(intent: MonetizationIntent, returnTo?: string | null) {
    const safeReturnTo = sanitizeInternalReturnTo(returnTo) || DEFAULT_RETURN_PATHS[intent];
    const url = new URL(safeReturnTo, 'https://askchetna.local');
    url.searchParams.set('purchase', 'success');
    url.searchParams.set('purchaseIntent', intent);
    return `${url.pathname}${url.search}`;
}
