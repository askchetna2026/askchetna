import prisma from '@/lib/prisma';

/**
 * Admin-configurable numbers for the consultation marketplace.
 *
 * Every value here is a business decision that will be tuned — session length,
 * revenue split, what a credit is notionally worth. None of them may be
 * hardcoded, because changing a hardcoded number means a deploy, and a deploy to
 * change a percentage is how percentages end up wrong for a week.
 *
 * Reads go through `getSettings()`, which falls back to DEFAULTS for any key not
 * yet present in the table. That makes the feature work on a fresh database with
 * no seeding step, and means adding a new setting never needs a data migration.
 *
 * Writes are admin-only. The schema cannot express that, so every write path
 * must check the role — see requireAdmin in the settings route.
 */

export const SETTING_KEYS = {
    CHAT_SECONDS_PER_CREDIT: 'CHAT_SECONDS_PER_CREDIT',
    AUDIO_SECONDS_PER_CREDIT: 'AUDIO_SECONDS_PER_CREDIT',
    VIDEO_SECONDS_PER_CREDIT: 'VIDEO_SECONDS_PER_CREDIT',
    EXTEND_PROMPT_AT_SECONDS: 'EXTEND_PROMPT_AT_SECONDS',
    ASTROLOGER_REVENUE_PCT: 'ASTROLOGER_REVENUE_PCT',
    CREDIT_VALUE_PAISE: 'CREDIT_VALUE_PAISE',
    /** Grace after the deadline before the sweeper force-closes a session. */
    SESSION_GRACE_SECONDS: 'SESSION_GRACE_SECONDS',
    /**
     * Whether calls may be taken in a browser. 0 = app only, 1 = web too.
     *
     * A product decision, not a technical limit — WebRTC is a browser API and
     * desktop browsers carry audio and video perfectly well. What native buys is
     * everything around the call: surviving backgrounding, ringing via push when
     * the app is closed, earpiece/speaker routing, lock-screen call UI. Those
     * matter on a phone and matter far less on a desktop.
     *
     * Kept configurable so the call can be revisited without a deploy.
     */
    ALLOW_WEB_CALLS: 'ALLOW_WEB_CALLS',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const DEFAULTS: Record<SettingKey, number> = {
    CHAT_SECONDS_PER_CREDIT: 300, // 1 credit = 5 minutes of chat
    AUDIO_SECONDS_PER_CREDIT: 120, // 1 credit = 2 minutes of audio
    VIDEO_SECONDS_PER_CREDIT: 120, // Phase 3; revisit, video costs more to carry
    EXTEND_PROMPT_AT_SECONDS: 60, // offer the extension with a minute left
    ASTROLOGER_REVENUE_PCT: 30, // astrologer keeps 30, AskChetna keeps 70
    CREDIT_VALUE_PAISE: 5000, // ₹50 notional value of one credit
    SESSION_GRACE_SECONDS: 15,
    ALLOW_WEB_CALLS: 0, // app only, per the original product decision
};

export const SETTING_DESCRIPTIONS: Record<SettingKey, string> = {
    CHAT_SECONDS_PER_CREDIT: 'Seconds of chat purchased by one credit.',
    AUDIO_SECONDS_PER_CREDIT: 'Seconds of audio call purchased by one credit.',
    VIDEO_SECONDS_PER_CREDIT: 'Seconds of video call purchased by one credit.',
    EXTEND_PROMPT_AT_SECONDS:
        'Seconds of remaining time at which the user is offered an extension.',
    ASTROLOGER_REVENUE_PCT:
        "Percentage of a served credit's value paid to the astrologer. The remainder stays with AskChetna.",
    CREDIT_VALUE_PAISE:
        'Notional value of one credit in paise, used to compute astrologer earnings.',
    SESSION_GRACE_SECONDS:
        'Seconds past the deadline before the sweeper force-closes an abandoned session.',
    ALLOW_WEB_CALLS:
        'Allow audio/video consultations in a browser. 0 = native apps only, 1 = web as well.',
};

/**
 * Guard rails. A mistyped revenue share is a payout incident, and a zero-second
 * block would bill a credit for nothing, so the API refuses obviously wrong
 * values rather than trusting the form.
 */
export const SETTING_BOUNDS: Record<SettingKey, { min: number; max: number }> = {
    CHAT_SECONDS_PER_CREDIT: { min: 30, max: 3600 },
    AUDIO_SECONDS_PER_CREDIT: { min: 30, max: 3600 },
    VIDEO_SECONDS_PER_CREDIT: { min: 30, max: 3600 },
    EXTEND_PROMPT_AT_SECONDS: { min: 10, max: 600 },
    ASTROLOGER_REVENUE_PCT: { min: 0, max: 100 },
    CREDIT_VALUE_PAISE: { min: 100, max: 1000000 },
    SESSION_GRACE_SECONDS: { min: 0, max: 300 },
    ALLOW_WEB_CALLS: { min: 0, max: 1 },
};

export type ConsultationSettings = Record<SettingKey, number>;

/** All settings, with DEFAULTS filling any gap. */
export async function getSettings(): Promise<ConsultationSettings> {
    const rows = await prisma.appSetting.findMany({
        where: { key: { in: Object.keys(DEFAULTS) } },
        select: { key: true, value: true },
    });

    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const result = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
        const value = stored.get(key);
        if (typeof value === 'number') result[key] = value;
    }
    return result;
}

export type ConsultationKind = 'CHAT' | 'AUDIO' | 'VIDEO';

/** Seconds one credit buys for a given mode. */
export function secondsPerCredit(
    kind: ConsultationKind,
    settings: ConsultationSettings
): number {
    switch (kind) {
        case 'AUDIO':
            return settings.AUDIO_SECONDS_PER_CREDIT;
        case 'VIDEO':
            return settings.VIDEO_SECONDS_PER_CREDIT;
        case 'CHAT':
        default:
            return settings.CHAT_SECONDS_PER_CREDIT;
    }
}

/**
 * What an astrologer earns for credits served.
 *
 * Takes the share and credit value as arguments rather than reading settings,
 * because callers must pass the values SNAPSHOTTED on the consultation. Reading
 * live settings here would silently restate historical earnings whenever an
 * admin edited the percentage, and figures that move after being paid cannot be
 * reconciled.
 */
export function earningsPaise(
    creditsServed: number,
    creditValuePaise: number,
    revenueSharePct: number
): number {
    return Math.round((creditsServed * creditValuePaise * revenueSharePct) / 100);
}
