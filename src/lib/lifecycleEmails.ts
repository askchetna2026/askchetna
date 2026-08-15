import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendLifecycleEmailMessage } from '@/lib/mail';
import { absoluteUrl } from '@/lib/site';
import {
    buildPricingUrl,
    isMonetizationIntent,
    sanitizeInternalReturnTo,
    type MonetizationIntent,
} from '@/lib/monetization';

type LifecycleUser = {
    id: string;
    email: string | null;
    name: string | null;
    isSubscribed: boolean;
};

type DeliveryOptions = {
    user: LifecycleUser | null;
    campaignKey: string;
    dedupeKey: string;
    subject: string;
    html: string;
    metadata?: Record<string, unknown>;
};

type LifecycleSendResult = {
    status: 'sent' | 'skipped' | 'failed';
    campaignKey: string;
    dedupeKey: string;
    userId?: string;
    email?: string | null;
    reason?: string;
};

export type LifecycleCampaignStats = {
    attempted: number;
    sent: number;
    skipped: number;
    failed: number;
    items: LifecycleSendResult[];
};

export type LifecycleCampaignName = 'all' | 'abandoned_topup' | 'clarity_reengagement';
export type LifecycleRunTrigger = 'manual' | 'traffic';

type LifecycleCampaignResults = {
    abandonedTopup?: LifecycleCampaignStats;
    clarityReengagement?: LifecycleCampaignStats;
};

type LifecyclePerformanceItem = {
    campaignKey: string;
    sent: number;
    uniqueRecipients: number;
    reengagedUsers: number;
    checkoutUsers: number;
    paymentUsers: number;
    clarityUsers: number;
    chartUnlockUsers: number;
    reportUnlockUsers: number;
    reportStartUsers: number;
    profileExpansionUsers: number;
    revenue: number;
    paymentConversionRate: number;
};

type LifecycleAutomationRunItem = {
    id: string;
    batchKey: string;
    campaignKey: string;
    triggerType: string;
    status: string;
    attempted: number;
    sent: number;
    skipped: number;
    failed: number;
    createdAt: Date;
};

const LIFECYCLE_LOOKBACK_DAYS = 30;
const LIFECYCLE_CONVERSION_WINDOW_DAYS = 7;
const DEFAULT_LIFECYCLE_LIMIT = 25;
const TRAFFIC_AUTOMATION_DEFAULT_LIMIT = 25;
const TRAFFIC_AUTOMATION_WINDOWS = {
    abandoned_topup: 6,
    clarity_reengagement: 12,
} as const;

function newStats(): LifecycleCampaignStats {
    return {
        attempted: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        items: [],
    };
}

function addResult(stats: LifecycleCampaignStats, result: LifecycleSendResult) {
    stats.attempted += 1;
    stats[result.status] += 1;
    stats.items.push(result);
}

function toJsonObject(value?: Record<string, unknown>) {
    return (value ?? {}) as Prisma.InputJsonObject;
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getFirstName(user: Pick<LifecycleUser, 'name' | 'email'>) {
    const raw = user.name?.trim() || user.email?.split('@')[0] || 'Seeker';
    return raw.split(/\s+/)[0];
}

function wrapLifecycleEmail(title: string, intro: string, body: string, cta?: { label: string; href: string }) {
    return `
        <div style="font-family: Arial, sans-serif; color: #101010; max-width: 620px; margin: 0 auto; padding: 28px; border: 1px solid #d4af37; border-radius: 16px; background: #fffdfa;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: #8b6a17; margin-bottom: 10px;">AskChetna</div>
                <h1 style="font-family: Georgia, serif; font-size: 30px; line-height: 1.15; margin: 0; color: #1d2340;">${title}</h1>
            </div>
            <p style="font-size: 16px; line-height: 1.75; color: #2f354f; margin: 0 0 18px;">${intro}</p>
            <div style="font-size: 15px; line-height: 1.75; color: #383f5e;">${body}</div>
            ${cta ? `
                <div style="margin-top: 28px; text-align: center;">
                    <a href="${cta.href}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #d4af37; color: #101010; font-weight: 700; text-decoration: none;">
                        ${cta.label}
                    </a>
                </div>
            ` : ''}
            <p style="margin-top: 28px; font-size: 12px; line-height: 1.6; color: #7c8195; text-align: center;">
                Awareness, not prediction.
            </p>
        </div>
    `;
}

async function getLifecycleUser(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            isSubscribed: true,
        },
    });
}

async function deliverLifecycleEmail(options: DeliveryOptions): Promise<LifecycleSendResult> {
    const baseResult = {
        campaignKey: options.campaignKey,
        dedupeKey: options.dedupeKey,
        userId: options.user?.id,
        email: options.user?.email,
    };

    if (!options.user) {
        return { ...baseResult, status: 'skipped', reason: 'user_not_found' };
    }

    if (!options.user.isSubscribed) {
        return { ...baseResult, status: 'skipped', reason: 'user_unsubscribed' };
    }

    if (!options.user.email) {
        return { ...baseResult, status: 'skipped', reason: 'missing_email' };
    }

    let lifecycleRecord = await prisma.lifecycleEmail.findUnique({
        where: { dedupeKey: options.dedupeKey },
    });

    if (lifecycleRecord && lifecycleRecord.status !== 'failed') {
        return { ...baseResult, status: 'skipped', reason: 'already_processed' };
    }

    lifecycleRecord = lifecycleRecord ?? await prisma.lifecycleEmail.create({
        data: {
            userId: options.user.id,
            campaignKey: options.campaignKey,
            dedupeKey: options.dedupeKey,
            subject: options.subject,
            metadata: toJsonObject(options.metadata),
        },
    });

    const sendResult = await sendLifecycleEmailMessage(options.user.email, options.subject, options.html);

    if (sendResult.success) {
        await prisma.lifecycleEmail.update({
            where: { id: lifecycleRecord.id },
            data: {
                status: 'sent',
                sentAt: new Date(),
                metadata: toJsonObject(options.metadata),
            },
        });

        return { ...baseResult, status: 'sent' };
    }

    await prisma.lifecycleEmail.update({
        where: { id: lifecycleRecord.id },
        data: {
            status: 'failed',
            metadata: toJsonObject({
                ...(options.metadata ?? {}),
                error: sendResult.error instanceof Error ? sendResult.error.message : 'send_failed',
            }),
        },
    });

    return { ...baseResult, status: 'failed', reason: 'send_failed' };
}

function monthBucket(date = new Date()) {
    return date.toISOString().slice(0, 7);
}

function hoursBetween(earlier: Date, later: Date) {
    return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60);
}

function daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function metadataToRecord(metadata: unknown) {
    return metadata && typeof metadata === 'object'
        ? metadata as Record<string, unknown>
        : {};
}

function getNumericMetadataValue(metadata: Record<string, unknown>, key: string) {
    const value = metadata[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function isLifecycleCampaignName(value: unknown): value is LifecycleCampaignName {
    return value === 'all' || value === 'abandoned_topup' || value === 'clarity_reengagement';
}

function normalizeLifecycleLimit(limit?: number, fallback = DEFAULT_LIFECYCLE_LIMIT) {
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
        return fallback;
    }

    return Math.min(Math.floor(limit), 100);
}

function getTrafficWindowBatchKey(campaign: Exclude<LifecycleCampaignName, 'all'>, windowHours: number, now = new Date()) {
    const bucketSizeMs = windowHours * 60 * 60 * 1000;
    const bucket = Math.floor(now.getTime() / bucketSizeMs);
    return `traffic:${campaign}:${windowHours}h:${bucket}`;
}

export async function sendWelcomeLifecycleEmail(userId: string) {
    const user = await getLifecycleUser(userId);
    const firstName = user ? escapeHtml(getFirstName(user)) : 'Seeker';

    return deliverLifecycleEmail({
        user,
        campaignKey: 'welcome_get_started',
        dedupeKey: `welcome:${userId}`,
        subject: 'Welcome to AskChetna: start with your chart, then ask better questions',
        metadata: {
            source: 'registration',
        },
        html: wrapLifecycleEmail(
            `Welcome, ${firstName}`,
            'Your free account is ready. The strongest first step is to create or refine your chart, then use Clarity for a question that already feels emotionally live.',
            `
                <p style="margin: 0 0 14px;">A simple way to begin:</p>
                <ol style="padding-left: 18px; margin: 0; line-height: 1.8;">
                    <li>Create your birth profile so the chart context is accurate.</li>
                    <li>Open Clarity and ask one specific question about love, timing, or work.</li>
                    <li>Save the answer that feels most useful, then return when the next layer of the pattern appears.</li>
                </ol>
                <p style="margin: 18px 0 0;">If you want the best starting prompt, ask about a repeating pattern rather than an outcome prediction.</p>
            `,
            {
                label: 'Open Your Dashboard',
                href: absoluteUrl('/dashboard'),
            }
        ),
    });
}

type TopUpSuccessOptions = {
    userId: string;
    paymentId: string;
    planName: string;
    credits: number;
    intent?: MonetizationIntent;
};

export async function sendTopUpSuccessLifecycleEmail(options: TopUpSuccessOptions) {
    const user = await getLifecycleUser(options.userId);
    const firstName = user ? escapeHtml(getFirstName(user)) : 'Seeker';
    const suggestedIntent = options.intent ?? 'top_up';

    return deliverLifecycleEmail({
        user,
        campaignKey: 'topup_success',
        dedupeKey: `topup-success:${options.paymentId}`,
        subject: `Your ${options.planName} credits are ready`,
        metadata: {
            paymentId: options.paymentId,
            planName: options.planName,
            credits: options.credits,
            intent: suggestedIntent,
        },
        html: wrapLifecycleEmail(
            `${firstName}, your credits are ready`,
            `Your recent purchase added ${options.credits} credits to your AskChetna account.`,
            `
                <p style="margin: 0 0 14px;">A few strong ways to use them right away:</p>
                <ul style="padding-left: 18px; margin: 0; line-height: 1.8;">
                    <li>Ask a follow-up question in Clarity while the pattern is still fresh.</li>
                    <li>Unlock a premium chart view that adds more nuance to the same issue.</li>
                    <li>Move into timing if you want to understand whether this is a season for effort, patience, repair, or release.</li>
                </ul>
            `,
            {
                label: 'Use Your Credits',
                href: absoluteUrl(suggestedIntent === 'chart_unlock' ? '/chart' : suggestedIntent === 'report' ? '/dashboard' : '/clarity'),
            }
        ),
    });
}

type LowCreditOptions = {
    userId: string;
    remainingCredits: number;
    source: string;
    returnTo: string;
};

export async function maybeSendLowCreditLifecycleEmail(options: LowCreditOptions) {
    if (options.remainingCredits > 2) {
        return {
            campaignKey: 'low_credit_nudge',
            dedupeKey: `low-credit:skip:${options.userId}:${options.remainingCredits}`,
            status: 'skipped' as const,
            reason: 'remaining_above_threshold',
            userId: options.userId,
        };
    }

    const user = await getLifecycleUser(options.userId);
    const firstName = user ? escapeHtml(getFirstName(user)) : 'Seeker';
    const remainingLabel =
        options.remainingCredits <= 0
            ? 'no credits left'
            : `${options.remainingCredits} credit${options.remainingCredits === 1 ? '' : 's'} left`;
    const thresholdBucket = options.remainingCredits <= 0 ? '0' : String(options.remainingCredits);
    const pricingUrl = absoluteUrl(buildPricingUrl({
        intent: 'top_up',
        source: options.source,
        returnTo: sanitizeInternalReturnTo(options.returnTo) || '/dashboard',
    }));

    return deliverLifecycleEmail({
        user,
        campaignKey: 'low_credit_nudge',
        dedupeKey: `low-credit:${options.userId}:${thresholdBucket}:${monthBucket()}`,
        subject: options.remainingCredits <= 0 ? 'You are out of credits on AskChetna' : `You have ${remainingLabel} on AskChetna`,
        metadata: {
            remainingCredits: options.remainingCredits,
            source: options.source,
            returnTo: options.returnTo,
        },
        html: wrapLifecycleEmail(
            `${firstName}, you have ${remainingLabel}`,
            'If you want to keep the current thread moving, this is usually the best moment to top up before the question loses energy.',
            `
                <p style="margin: 0 0 14px;">People usually use a small top-up here when they want to:</p>
                <ul style="padding-left: 18px; margin: 0; line-height: 1.8;">
                    <li>Ask the next question while the first answer is still alive.</li>
                    <li>Unlock a premium chart layer without dropping out of the flow.</li>
                    <li>Generate or unlock a deeper report without starting over later.</li>
                </ul>
            `,
            {
                label: 'Top Up Credits',
                href: pricingUrl,
            }
        ),
    });
}

type FirstClarityOptions = {
    userId: string;
    questionId: string;
};

export async function maybeSendFirstClarityFollowupEmail(options: FirstClarityOptions) {
    const totalQuestions = await prisma.question.count({
        where: { userId: options.userId },
    });

    if (totalQuestions !== 1) {
        return {
            campaignKey: 'first_clarity_followup',
            dedupeKey: `first-clarity:${options.userId}`,
            status: 'skipped' as const,
            reason: 'not_first_question',
            userId: options.userId,
        };
    }

    const user = await getLifecycleUser(options.userId);
    const firstName = user ? escapeHtml(getFirstName(user)) : 'Seeker';

    return deliverLifecycleEmail({
        user,
        campaignKey: 'first_clarity_followup',
        dedupeKey: `first-clarity:${options.userId}`,
        subject: 'Your first AskChetna reflection is a good place to go one layer deeper',
        metadata: {
            questionId: options.questionId,
        },
        html: wrapLifecycleEmail(
            `${firstName}, your first Clarity session is complete`,
            'The most useful next step is usually not a totally different question. It is one cleaner follow-up about the same pattern you just uncovered.',
            `
                <p style="margin: 0 0 14px;">Two strong follow-up directions:</p>
                <ul style="padding-left: 18px; margin: 0; line-height: 1.8;">
                    <li>Ask what emotional trigger keeps the same pattern active.</li>
                    <li>Ask what this phase is asking you to practice rather than resist.</li>
                </ul>
            `,
            {
                label: 'Ask Your Next Question',
                href: absoluteUrl('/clarity'),
            }
        ),
    });
}

function extractIntent(value: unknown): MonetizationIntent {
    return typeof value === 'string' && isMonetizationIntent(value) ? value : 'top_up';
}

export async function runAbandonedTopUpReminderCampaign(limit = DEFAULT_LIFECYCLE_LIMIT) {
    const stats = newStats();
    const now = new Date();
    const lookback = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events = await prisma.analyticsEvent.findMany({
        where: {
            userId: { not: null },
            type: {
                in: ['checkout_started', 'payment_success'],
            },
            createdAt: { gte: lookback },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
    });

    const latestCheckoutByUser = new Map<string, typeof events[number]>();
    const latestPaymentByUser = new Map<string, typeof events[number]>();

    for (const event of events) {
        if (!event.userId) continue;

        if (event.type === 'checkout_started' && !latestCheckoutByUser.has(event.userId)) {
            latestCheckoutByUser.set(event.userId, event);
        }

        if (event.type === 'payment_success' && !latestPaymentByUser.has(event.userId)) {
            latestPaymentByUser.set(event.userId, event);
        }
    }

    const candidates = Array.from(latestCheckoutByUser.values())
        .filter((checkoutEvent) => {
            if (!checkoutEvent.userId) return false;
            const latestPayment = latestPaymentByUser.get(checkoutEvent.userId);
            const hasPaidAfterCheckout = latestPayment && latestPayment.createdAt >= checkoutEvent.createdAt;
            const hasWaitedLongEnough = hoursBetween(checkoutEvent.createdAt, now) >= 6;
            return !hasPaidAfterCheckout && hasWaitedLongEnough;
        })
        .slice(0, limit);

    for (const checkoutEvent of candidates) {
        const user = await getLifecycleUser(checkoutEvent.userId!);
        const firstName = user ? escapeHtml(getFirstName(user)) : 'Seeker';
        const meta = (checkoutEvent.metadata ?? {}) as Record<string, unknown>;
        const intent = extractIntent(meta.intent);
        const returnTo = typeof meta.returnTo === 'string' ? meta.returnTo : '/pricing';
        const source = typeof meta.source === 'string' ? meta.source : 'abandoned_checkout_email';
        const planName = typeof meta.planName === 'string' ? meta.planName : 'your selected pack';
        const pricingUrl = absoluteUrl(buildPricingUrl({
            intent,
            source: `email_${source}`,
            returnTo: sanitizeInternalReturnTo(returnTo) || '/pricing',
        }));

        const result = await deliverLifecycleEmail({
            user,
            campaignKey: 'abandoned_topup_reminder',
            dedupeKey: `abandoned-topup:${checkoutEvent.id}`,
            subject: `Your ${planName} checkout is still open`,
            metadata: {
                checkoutEventId: checkoutEvent.id,
                intent,
                source,
                returnTo,
                planName,
            },
            html: wrapLifecycleEmail(
                `${firstName}, your checkout is still there`,
                'If you left mid-way, you can come back when you are ready. The chart, question, or report that brought you there is still a good place to continue from.',
                `
                    <p style="margin: 0 0 14px;">Most people return here because they want to:</p>
                    <ul style="padding-left: 18px; margin: 0; line-height: 1.8;">
                        <li>Keep the same clarity thread going without starting from zero.</li>
                        <li>Unlock a premium chart view while the insight is still fresh.</li>
                        <li>Finish a report or timing flow they were already halfway into.</li>
                    </ul>
                `,
                {
                    label: 'Resume Top-Up',
                    href: pricingUrl,
                }
            ),
        });

        addResult(stats, result);
    }

    return stats;
}

export async function runClarityReengagementCampaign(limit = DEFAULT_LIFECYCLE_LIMIT) {
    const stats = newStats();
    const now = new Date();
    const oldestEligible = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const newestEligible = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const questions = await prisma.question.findMany({
        where: {
            createdAt: {
                gte: oldestEligible,
                lte: newestEligible,
            },
            user: {
                isSubscribed: true,
            },
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            questionText: true,
            createdAt: true,
            userId: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isSubscribed: true,
                },
            },
        },
        take: 500,
    });

    const latestQuestionByUser = new Map<string, typeof questions[number]>();
    for (const question of questions) {
        if (!latestQuestionByUser.has(question.userId)) {
            latestQuestionByUser.set(question.userId, question);
        }
    }

    for (const question of Array.from(latestQuestionByUser.values()).slice(0, limit)) {
        const preview = escapeHtml(question.questionText.trim().slice(0, 120));
        const firstName = escapeHtml(getFirstName(question.user));

        const result = await deliverLifecycleEmail({
            user: question.user,
            campaignKey: 'clarity_reengagement',
            dedupeKey: `clarity-reengagement:${question.id}`,
            subject: 'Your last AskChetna reading may have one more layer in it',
            metadata: {
                questionId: question.id,
                askedAt: question.createdAt.toISOString(),
            },
            html: wrapLifecycleEmail(
                `${firstName}, your last question may be ready for a follow-up`,
                'A good AskChetna session often becomes more useful a few days later, once the first answer has had time to settle into real life.',
                `
                    <p style="margin: 0 0 12px;">Your recent question:</p>
                    <blockquote style="margin: 0 0 18px; padding: 14px 18px; border-left: 3px solid #d4af37; background: #f7f2df; color: #2b3044;">
                        ${preview}${question.questionText.length > 120 ? '...' : ''}
                    </blockquote>
                    <p style="margin: 0;">If something has shifted since then, a follow-up question about the same pattern usually reveals more than starting on an unrelated topic.</p>
                `,
                {
                    label: 'Return to Clarity',
                    href: absoluteUrl('/clarity'),
                }
            ),
        });

        addResult(stats, result);
    }

    return stats;
}

async function createLifecycleAutomationRun(input: {
    batchKey: string;
    campaignKey: string;
    triggerType: LifecycleRunTrigger;
    status: 'running' | 'completed' | 'failed';
    stats?: LifecycleCampaignStats;
    metadata?: Record<string, unknown>;
}) {
    return prisma.lifecycleAutomationRun.create({
        data: {
            batchKey: input.batchKey,
            campaignKey: input.campaignKey,
            triggerType: input.triggerType,
            status: input.status,
            attempted: input.stats?.attempted ?? 0,
            sent: input.stats?.sent ?? 0,
            skipped: input.stats?.skipped ?? 0,
            failed: input.stats?.failed ?? 0,
            metadata: toJsonObject(input.metadata),
        },
    });
}

async function updateLifecycleAutomationRun(input: {
    id: string;
    status: 'completed' | 'failed';
    stats?: LifecycleCampaignStats;
    metadata?: Record<string, unknown>;
}) {
    await prisma.lifecycleAutomationRun.update({
        where: { id: input.id },
        data: {
            status: input.status,
            attempted: input.stats?.attempted ?? 0,
            sent: input.stats?.sent ?? 0,
            skipped: input.stats?.skipped ?? 0,
            failed: input.stats?.failed ?? 0,
            metadata: toJsonObject(input.metadata),
        },
    });
}

async function executeLifecycleCampaignRun(input: {
    batchKey: string;
    campaignKey: string;
    triggerType: LifecycleRunTrigger;
    limit: number;
    runner: (limit: number) => Promise<LifecycleCampaignStats>;
    existingRunId?: string;
    metadata?: Record<string, unknown>;
}) {
    const runMetadata = {
        limit: input.limit,
        ...(input.metadata ?? {}),
    };

    try {
        const stats = await input.runner(input.limit);

        if (input.existingRunId) {
            await updateLifecycleAutomationRun({
                id: input.existingRunId,
                status: 'completed',
                stats,
                metadata: runMetadata,
            });
        } else {
            await createLifecycleAutomationRun({
                batchKey: input.batchKey,
                campaignKey: input.campaignKey,
                triggerType: input.triggerType,
                status: 'completed',
                stats,
                metadata: runMetadata,
            });
        }

        return stats;
    } catch (error) {
        const failureMetadata = {
            ...runMetadata,
            error: error instanceof Error ? error.message : 'unknown_error',
        };

        if (input.existingRunId) {
            await updateLifecycleAutomationRun({
                id: input.existingRunId,
                status: 'failed',
                metadata: failureMetadata,
            });
        } else {
            await createLifecycleAutomationRun({
                batchKey: input.batchKey,
                campaignKey: input.campaignKey,
                triggerType: input.triggerType,
                status: 'failed',
                metadata: failureMetadata,
            });
        }

        throw error;
    }
}

type TrafficAutomationCampaignConfig = {
    campaign: Exclude<LifecycleCampaignName, 'all'>;
    campaignKey: string;
    windowHours: number;
    limit: number;
    runner: (limit: number) => Promise<LifecycleCampaignStats>;
};

function getTrafficAutomationConfigs(): TrafficAutomationCampaignConfig[] {
    return [
        {
            campaign: 'abandoned_topup',
            campaignKey: 'abandoned_topup_reminder',
            windowHours: TRAFFIC_AUTOMATION_WINDOWS.abandoned_topup,
            limit: TRAFFIC_AUTOMATION_DEFAULT_LIMIT,
            runner: runAbandonedTopUpReminderCampaign,
        },
        {
            campaign: 'clarity_reengagement',
            campaignKey: 'clarity_reengagement',
            windowHours: TRAFFIC_AUTOMATION_WINDOWS.clarity_reengagement,
            limit: TRAFFIC_AUTOMATION_DEFAULT_LIMIT,
            runner: runClarityReengagementCampaign,
        },
    ];
}

async function claimTrafficAutomationRun(config: TrafficAutomationCampaignConfig, triggerSource: string, now: Date) {
    const batchKey = getTrafficWindowBatchKey(config.campaign, config.windowHours, now);

    const run = await prisma.$transaction(async (tx) => {
        const existingRun = await tx.lifecycleAutomationRun.findFirst({
            where: {
                campaignKey: config.campaignKey,
                batchKey,
                triggerType: 'traffic',
            },
            select: { id: true },
        });

        if (existingRun) {
            return null;
        }

        return tx.lifecycleAutomationRun.create({
            data: {
                batchKey,
                campaignKey: config.campaignKey,
                triggerType: 'traffic',
                status: 'running',
                metadata: toJsonObject({
                    triggerSource,
                    windowHours: config.windowHours,
                    mode: 'traffic_driven',
                }),
            },
        });
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        // Two round trips under Serializable, on a pooled connection, from a
        // route that runs during ordinary page traffic. Prisma's 5s default was
        // being exceeded routinely — observed at 7.0s, 11.9s and 12.0s in one
        // session — and every one of those throws P2028 and silently drops the
        // campaign for that window. That is the "campaign mail goes quiet"
        // failure, and it fails closed with nothing user-visible.
        //
        // A timeout is the mitigation, not the fix: this claim wants a unique
        // constraint on (campaignKey, batchKey, triggerType) so it can be a
        // plain create that catches P2002, with no transaction at all.
        timeout: 20_000,
        maxWait: 10_000,
    });

    return {
        batchKey,
        run,
    };
}

export async function maybeRunLifecycleAutomation(triggerSource: string) {
    const now = new Date();

    for (const config of getTrafficAutomationConfigs()) {
        try {
            const { batchKey, run } = await claimTrafficAutomationRun(config, triggerSource, now);

            if (!run) {
                continue;
            }

            await executeLifecycleCampaignRun({
                batchKey,
                campaignKey: config.campaignKey,
                triggerType: 'traffic',
                limit: config.limit,
                runner: config.runner,
                existingRunId: run.id,
                metadata: {
                    triggerSource,
                    windowHours: config.windowHours,
                    mode: 'traffic_driven',
                },
            });
        } catch (error) {
            // P2034 is this design working, not failing. The claim runs at
            // SERIALIZABLE precisely so that two page views arriving together
            // cannot both open the same campaign window; the loser aborts, which
            // is the outcome we want. Logging it as an error made a correct
            // no-op look like an incident on every concurrent visit.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
                continue;
            }
            console.error(`Traffic lifecycle automation failed for ${config.campaignKey}:`, error);
        }
    }
}

export async function runLifecycleCampaignBatch(options: {
    campaign?: LifecycleCampaignName;
    limit?: number;
    triggerType?: LifecycleRunTrigger;
}) {
    const campaign = options.campaign ?? 'all';
    const triggerType = options.triggerType ?? 'manual';
    const normalizedLimit = normalizeLifecycleLimit(options.limit, DEFAULT_LIFECYCLE_LIMIT);
    const batchKey = `${triggerType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results: LifecycleCampaignResults = {};

    if (campaign === 'all' || campaign === 'abandoned_topup') {
        results.abandonedTopup = await executeLifecycleCampaignRun({
            batchKey,
            campaignKey: 'abandoned_topup_reminder',
            triggerType,
            limit: normalizedLimit,
            runner: runAbandonedTopUpReminderCampaign,
        });
    }

    if (campaign === 'all' || campaign === 'clarity_reengagement') {
        results.clarityReengagement = await executeLifecycleCampaignRun({
            batchKey,
            campaignKey: 'clarity_reengagement',
            triggerType,
            limit: normalizedLimit,
            runner: runClarityReengagementCampaign,
        });
    }

    return {
        batchKey,
        campaign,
        triggerType,
        limit: normalizedLimit,
        results,
    };
}

async function getLifecyclePerformanceData(since: Date): Promise<LifecyclePerformanceItem[]> {
    const sentEmails = await prisma.lifecycleEmail.findMany({
        where: {
            createdAt: { gte: since },
            status: 'sent',
            sentAt: { not: null },
        },
        select: {
            id: true,
            userId: true,
            campaignKey: true,
            sentAt: true,
        },
        orderBy: { sentAt: 'desc' },
    });

    if (sentEmails.length === 0) {
        return [];
    }

    const userIds = Array.from(new Set(sentEmails.map((item) => item.userId)));
    const earliestSentAt = sentEmails.reduce<Date>(
        (earliest, item) => item.sentAt && item.sentAt < earliest ? item.sentAt : earliest,
        sentEmails[0].sentAt ?? since
    );
    const latestWindowEnd = sentEmails.reduce<Date>(
        (latest, item) => {
            if (!item.sentAt) {
                return latest;
            }
            const windowEnd = new Date(item.sentAt.getTime() + LIFECYCLE_CONVERSION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
            return windowEnd > latest ? windowEnd : latest;
        },
        sentEmails[0].sentAt
            ? new Date(sentEmails[0].sentAt.getTime() + LIFECYCLE_CONVERSION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
            : since
    );

    const events = await prisma.analyticsEvent.findMany({
        where: {
            userId: { in: userIds },
            createdAt: {
                gte: earliestSentAt,
                lte: latestWindowEnd,
            },
            type: {
                in: ['checkout_started', 'payment_success', 'credit_used', 'report_started'],
            },
        },
        select: {
            id: true,
            userId: true,
            type: true,
            createdAt: true,
            metadata: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    const eventsByUser = new Map<string, typeof events>();
    for (const event of events) {
        if (!event.userId) {
            continue;
        }

        const current = eventsByUser.get(event.userId) ?? [];
        current.push(event);
        eventsByUser.set(event.userId, current);
    }

    type PerformanceAccumulator = {
        campaignKey: string;
        sent: number;
        recipients: Set<string>;
        reengagedUsers: Set<string>;
        checkoutUsers: Set<string>;
        paymentUsers: Set<string>;
        clarityUsers: Set<string>;
        chartUnlockUsers: Set<string>;
        reportUnlockUsers: Set<string>;
        reportStartUsers: Set<string>;
        profileExpansionUsers: Set<string>;
        countedPaymentEvents: Set<string>;
        revenue: number;
    };

    const performanceMap = new Map<string, PerformanceAccumulator>();

    for (const email of sentEmails) {
        if (!email.sentAt) {
            continue;
        }

        const performance = performanceMap.get(email.campaignKey) ?? {
            campaignKey: email.campaignKey,
            sent: 0,
            recipients: new Set<string>(),
            reengagedUsers: new Set<string>(),
            checkoutUsers: new Set<string>(),
            paymentUsers: new Set<string>(),
            clarityUsers: new Set<string>(),
            chartUnlockUsers: new Set<string>(),
            reportUnlockUsers: new Set<string>(),
            reportStartUsers: new Set<string>(),
            profileExpansionUsers: new Set<string>(),
            countedPaymentEvents: new Set<string>(),
            revenue: 0,
        };

        performance.sent += 1;
        performance.recipients.add(email.userId);

        const windowEnd = new Date(email.sentAt.getTime() + LIFECYCLE_CONVERSION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const userEvents = eventsByUser.get(email.userId) ?? [];
        let hadReengagement = false;

        for (const event of userEvents) {
            if (event.createdAt < email.sentAt || event.createdAt > windowEnd) {
                continue;
            }

            hadReengagement = true;
            const metadata = metadataToRecord(event.metadata);

            if (event.type === 'checkout_started') {
                performance.checkoutUsers.add(email.userId);
                continue;
            }

            if (event.type === 'payment_success') {
                performance.paymentUsers.add(email.userId);
                if (!performance.countedPaymentEvents.has(event.id)) {
                    performance.countedPaymentEvents.add(event.id);
                    performance.revenue += (getNumericMetadataValue(metadata, 'amount') ?? 0) / 100;
                }
                continue;
            }

            if (event.type === 'report_started') {
                performance.reportStartUsers.add(email.userId);
                continue;
            }

            if (event.type === 'credit_used') {
                const feature = typeof metadata.feature === 'string' ? metadata.feature : null;

                if (feature === 'clarity_question') {
                    performance.clarityUsers.add(email.userId);
                }

                if (feature === 'chart_unlock') {
                    performance.chartUnlockUsers.add(email.userId);
                }

                if (feature === 'premium_report_unlock') {
                    performance.reportUnlockUsers.add(email.userId);
                }

                if (feature === 'profile_limit_expansion') {
                    performance.profileExpansionUsers.add(email.userId);
                }
            }
        }

        if (hadReengagement) {
            performance.reengagedUsers.add(email.userId);
        }

        performanceMap.set(email.campaignKey, performance);
    }

    return Array.from(performanceMap.values())
        .map((item) => {
            const uniqueRecipients = item.recipients.size;
            const paymentConversionRate = uniqueRecipients > 0
                ? Number(((item.paymentUsers.size / uniqueRecipients) * 100).toFixed(1))
                : 0;

            return {
                campaignKey: item.campaignKey,
                sent: item.sent,
                uniqueRecipients,
                reengagedUsers: item.reengagedUsers.size,
                checkoutUsers: item.checkoutUsers.size,
                paymentUsers: item.paymentUsers.size,
                clarityUsers: item.clarityUsers.size,
                chartUnlockUsers: item.chartUnlockUsers.size,
                reportUnlockUsers: item.reportUnlockUsers.size,
                reportStartUsers: item.reportStartUsers.size,
                profileExpansionUsers: item.profileExpansionUsers.size,
                revenue: Number(item.revenue.toFixed(2)),
                paymentConversionRate,
            };
        })
        .sort((a, b) => b.sent - a.sent || a.campaignKey.localeCompare(b.campaignKey));
}

export async function getLifecycleDashboardData() {
    const since = daysAgo(LIFECYCLE_LOOKBACK_DAYS);

    const [summary, recent, performance, recentRuns] = await Promise.all([
        prisma.lifecycleEmail.groupBy({
            by: ['campaignKey', 'status'],
            where: { createdAt: { gte: since } },
            _count: { _all: true },
            orderBy: [{ campaignKey: 'asc' }, { status: 'asc' }],
        }),
        prisma.lifecycleEmail.findMany({
            where: { createdAt: { gte: since } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        }),
        getLifecyclePerformanceData(since),
        prisma.lifecycleAutomationRun.findMany({
            where: { createdAt: { gte: since } },
            orderBy: { createdAt: 'desc' },
            take: 12,
        }),
    ]);

    const lastTrafficRun = recentRuns.find((item) => item.triggerType === 'traffic' && item.status === 'completed');

    return {
        summary,
        recent: recent.map((item) => ({
            id: item.id,
            campaignKey: item.campaignKey,
            status: item.status,
            subject: item.subject,
            sentAt: item.sentAt,
            createdAt: item.createdAt,
            user: {
                email: item.user.email,
                name: item.user.name,
            },
        })),
        performance,
        recentRuns: recentRuns.map((item: LifecycleAutomationRunItem) => ({
            id: item.id,
            batchKey: item.batchKey,
            campaignKey: item.campaignKey,
            triggerType: item.triggerType,
            status: item.status,
            attempted: item.attempted,
            sent: item.sent,
            skipped: item.skipped,
            failed: item.failed,
            createdAt: item.createdAt,
        })),
        lookbackDays: LIFECYCLE_LOOKBACK_DAYS,
        conversionWindowDays: LIFECYCLE_CONVERSION_WINDOW_DAYS,
        automation: {
            mode: 'traffic',
            description: 'Runs automatically from normal site activity without any cron dependency.',
            triggerSource: 'internal analytics tracking',
            abandonedTopUpWindowHours: TRAFFIC_AUTOMATION_WINDOWS.abandoned_topup,
            clarityReengagementWindowHours: TRAFFIC_AUTOMATION_WINDOWS.clarity_reengagement,
            defaultTrafficLimit: TRAFFIC_AUTOMATION_DEFAULT_LIMIT,
            lastTrafficRunAt: lastTrafficRun?.createdAt ?? null,
        },
    };
}
