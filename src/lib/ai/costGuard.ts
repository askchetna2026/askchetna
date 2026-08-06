import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Spend guard for AI endpoints that are NOT gated on credits.
 *
 * Most AI work in the app is paid for with credits, and the balance is what
 * limits it — `clarity/ask` says as much, and only carries a rate limit for
 * bursts. These flows are free to the user, so nothing limits them at all:
 * signing up is instant and costs nothing, which makes an uncapped LLM bill one
 * throwaway account away.
 *
 * Two windows, because they stop different things. The burst window stops a
 * loop or a stuck retry hammering the provider in seconds. The daily window is
 * what bounds the bill for a determined caller who paces themselves.
 *
 * HONEST LIMITATION: `rateLimit` keeps its counters in process memory, so they
 * are per-instance and reset on a cold start. That makes the daily figure a
 * strong deterrent rather than a hard ceiling — a caller spread across enough
 * instances gets more than one day's worth. Closing that properly needs a
 * shared store (Upstash, or a counter table); making these flows cost credits
 * would close it too, but that is a product decision rather than a fix.
 */

/** Enough for real use in a sitting — chart insights are read a few at a time,
 *  not dozens. */
const BURST = { limit: 6, windowMs: 60_000 };

/** A day's honest use for one person, well below a level that costs real money. */
const DAILY = { limit: 40, windowMs: 24 * 60 * 60 * 1000 };

/**
 * Returns a 429 to send back, or null to carry on.
 *
 * Keyed per user AND per flow, so exhausting one screen's allowance never locks
 * somebody out of a different feature.
 */
export function guardAiSpend(userId: string, flow: string): NextResponse | null {
    const burst = rateLimit(`ai:${flow}:burst:${userId}`, BURST);
    if (!burst.allowed) {
        return NextResponse.json(
            {
                error: 'Too quick',
                message: 'That is a lot of readings at once. Give it a moment and try again.',
            },
            { status: 429, headers: { 'Retry-After': String(burst.retryAfterSeconds) } }
        );
    }

    const daily = rateLimit(`ai:${flow}:day:${userId}`, DAILY);
    if (!daily.allowed) {
        return NextResponse.json(
            {
                error: 'Daily limit reached',
                message:
                    'You have reached today’s limit for this reading. It resets in a few hours.',
            },
            { status: 429, headers: { 'Retry-After': String(daily.retryAfterSeconds) } }
        );
    }

    return null;
}
