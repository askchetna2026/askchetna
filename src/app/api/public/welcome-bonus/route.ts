import { NextResponse } from 'next/server';
import { getWelcomeBonusCredits } from '@/lib/welcomeBonus';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * The sign-up grant, for client components that cannot be handed it by a server
 * component. `getWelcomeBonusCredits` already swallows database failures and
 * returns the default, so there is nothing left to catch here.
 */
export async function GET() {
    return NextResponse.json(
        { bonusAmount: await getWelcomeBonusCredits() },
        {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        }
    );
}
