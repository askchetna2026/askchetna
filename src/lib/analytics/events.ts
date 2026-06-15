export const ANALYTICS_EVENTS = {
    PAGE_VIEW: 'page_view',
    LANDING_VIEW: 'landing_view',
    TEASER_STARTED: 'teaser_started',
    TEASER_COMPLETED: 'teaser_completed',
    SIGNUP_STARTED: 'signup_started',
    SIGNUP_COMPLETED: 'signup_completed',
    PRICING_VIEWED: 'pricing_viewed',
    CHECKOUT_STARTED: 'checkout_started',
    PAYMENT_SUCCESS: 'payment_success',
    CREDIT_USED: 'credit_used',
    REPORT_STARTED: 'report_started',
    NEWSLETTER_SUBSCRIBED: 'newsletter_subscribed',
} as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const PAGE_VIEW_EVENT_TYPES = ['PAGE_VIEW', ANALYTICS_EVENTS.PAGE_VIEW] as const;

export const FUNNEL_EVENT_ORDER: AnalyticsEventType[] = [
    ANALYTICS_EVENTS.LANDING_VIEW,
    ANALYTICS_EVENTS.TEASER_STARTED,
    ANALYTICS_EVENTS.TEASER_COMPLETED,
    ANALYTICS_EVENTS.SIGNUP_STARTED,
    ANALYTICS_EVENTS.SIGNUP_COMPLETED,
    ANALYTICS_EVENTS.PRICING_VIEWED,
    ANALYTICS_EVENTS.CHECKOUT_STARTED,
    ANALYTICS_EVENTS.PAYMENT_SUCCESS,
    ANALYTICS_EVENTS.CREDIT_USED,
    ANALYTICS_EVENTS.REPORT_STARTED,
    ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBED,
];

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventType, string> = {
    [ANALYTICS_EVENTS.PAGE_VIEW]: 'Page Views',
    [ANALYTICS_EVENTS.LANDING_VIEW]: 'Landing Views',
    [ANALYTICS_EVENTS.TEASER_STARTED]: 'Teaser Starts',
    [ANALYTICS_EVENTS.TEASER_COMPLETED]: 'Teaser Completions',
    [ANALYTICS_EVENTS.SIGNUP_STARTED]: 'Signup Starts',
    [ANALYTICS_EVENTS.SIGNUP_COMPLETED]: 'Signup Completions',
    [ANALYTICS_EVENTS.PRICING_VIEWED]: 'Pricing Views',
    [ANALYTICS_EVENTS.CHECKOUT_STARTED]: 'Checkout Starts',
    [ANALYTICS_EVENTS.PAYMENT_SUCCESS]: 'Successful Payments',
    [ANALYTICS_EVENTS.CREDIT_USED]: 'Credits Used',
    [ANALYTICS_EVENTS.REPORT_STARTED]: 'Report Generations',
    [ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBED]: 'Newsletter Subscriptions',
};

const TRACKABLE_EVENT_SET = new Set<string>([
    ...Object.values(ANALYTICS_EVENTS),
    ...PAGE_VIEW_EVENT_TYPES,
]);

export function isAnalyticsEventType(value: unknown): value is AnalyticsEventType {
    return typeof value === 'string' && TRACKABLE_EVENT_SET.has(value);
}
