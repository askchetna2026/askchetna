import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';
import {
    DEFAULTS,
    SETTING_BOUNDS,
    SETTING_DESCRIPTIONS,
    getSettings,
    type SettingKey,
} from '@/lib/consultations/settings';

/**
 * Read and write the consultation settings.
 *
 * Admin only, on both verbs. These control what users are charged and what
 * astrologers are paid, so read access is restricted too — the revenue split is
 * not something to expose on a public endpoint.
 *
 * Values are bounds-checked server-side. A mistyped revenue share is a payout
 * incident and a zero-second block would bill a credit for nothing, so the API
 * refuses obviously wrong numbers rather than trusting the form that sent them.
 */
export async function GET() {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const current = await getSettings();
    const stored = await prisma.appSetting.findMany({
        select: { key: true, updatedAt: true, updatedBy: true },
    });
    const meta = new Map(stored.map((s) => [s.key, s]));

    return NextResponse.json({
        settings: (Object.keys(DEFAULTS) as SettingKey[]).map((key) => ({
            key,
            value: current[key],
            default: DEFAULTS[key],
            isOverridden: meta.has(key),
            description: SETTING_DESCRIPTIONS[key],
            min: SETTING_BOUNDS[key].min,
            max: SETTING_BOUNDS[key].max,
            updatedAt: meta.get(key)?.updatedAt?.toISOString() ?? null,
            updatedBy: meta.get(key)?.updatedBy ?? null,
        })),
    });
}

export async function PUT(request: Request) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await auth();

    let body: { settings?: Record<string, number> };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const incoming = body.settings ?? {};
    const errors: string[] = [];
    const writes: Array<{ key: SettingKey; value: number }> = [];

    for (const [key, raw] of Object.entries(incoming)) {
        if (!(key in DEFAULTS)) {
            errors.push(`Unknown setting: ${key}`);
            continue;
        }
        const settingKey = key as SettingKey;
        const value = Number(raw);
        const bounds = SETTING_BOUNDS[settingKey];

        if (!Number.isInteger(value)) {
            errors.push(`${key} must be a whole number`);
            continue;
        }
        if (value < bounds.min || value > bounds.max) {
            errors.push(`${key} must be between ${bounds.min} and ${bounds.max}`);
            continue;
        }
        writes.push({ key: settingKey, value });
    }

    // All or nothing. A partial write would leave the pricing half-changed,
    // which is worse than rejecting the lot and being told why.
    if (errors.length > 0) {
        return NextResponse.json({ error: 'Invalid settings', details: errors }, { status: 400 });
    }
    if (writes.length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updatedBy = session?.user?.email ?? 'admin';
    await prisma.$transaction(
        writes.map((w) =>
            prisma.appSetting.upsert({
                where: { key: w.key },
                create: {
                    key: w.key,
                    value: w.value,
                    description: SETTING_DESCRIPTIONS[w.key],
                    updatedBy,
                },
                update: { value: w.value, updatedBy },
            })
        )
    );

    // Existing sessions are unaffected: rates are snapshotted when a session
    // opens, so nobody mid-consultation has the ground moved under them.
    return NextResponse.json({ settings: await getSettings(), updated: writes.length });
}
