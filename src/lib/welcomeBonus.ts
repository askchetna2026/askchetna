import prisma from '@/lib/prisma';

/**
 * The sign-up credit grant, in one place.
 *
 * The amount is an admin setting — the `WELCOME_BONUS` row of `ServiceCost`,
 * editable in Admin -> Services — but it used to be re-read, and re-defaulted,
 * at seven separate call sites. Every one of them fell back to a literal `10`,
 * so lowering the real grant to 2 left "10 free credits" showing on the banner,
 * the login reminder and the pricing metadata: the fallback was wrong often
 * enough to be the number most visitors actually saw.
 *
 * A default is still needed — the row can be missing on a fresh database, and
 * the marketing pages must render when the database is unreachable — but there
 * should only ever be one of it, and it should not contradict the configured
 * value.
 */

/**
 * Used only when the setting cannot be read. Keep it equal to the value seeded
 * by `src/app/api/admin/services/route.ts`, which is the same constant.
 */
export const DEFAULT_WELCOME_BONUS_CREDITS = 2;

/**
 * The configured sign-up grant.
 *
 * Never throws. Callers include the root layout and the public pricing
 * metadata, where a database blip must degrade to the default rather than take
 * the page down.
 */
export async function getWelcomeBonusCredits(): Promise<number> {
    try {
        const setting = await prisma.serviceCost.findUnique({
            where: { key: 'WELCOME_BONUS' },
            // Explicit select: this is read on the root layout, so a column
            // added to ServiceCost ahead of its migration would otherwise 500
            // every page with P2022.
            select: { credits: true },
        });
        return setting?.credits ?? DEFAULT_WELCOME_BONUS_CREDITS;
    } catch (error) {
        console.error('[welcomeBonus] lookup failed:', error);
        return DEFAULT_WELCOME_BONUS_CREDITS;
    }
}
