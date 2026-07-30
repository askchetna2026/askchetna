#!/usr/bin/env node
/**
 * Creates (or updates) the built-in AI astrologers.
 *
 * Idempotent, and keyed on displayName rather than a hardcoded id so it is safe
 * to re-run after editing a persona here — it updates rather than duplicating.
 * It deliberately does NOT overwrite `creditsPerBlock` or `status` on a persona
 * that already exists: those are admin decisions made in the console, and a
 * re-run should not quietly undo a price change or an un-approval.
 *
 * Run against one environment at a time, the same way migrations are:
 *   dotenv -e .env.local   -- node scripts/seed-ai-astrologers.mjs
 *   dotenv -e .env.preview -- node scripts/seed-ai-astrologers.mjs
 *   dotenv -e .env.prod    -- node scripts/seed-ai-astrologers.mjs
 *
 * NAMING
 * Both names are Sanskrit words describing the *approach*, not honorifics and
 * not the names of real astrologers living or dead. "Acharya <RealPerson>"
 * would imply a specific human endorses this, and a fabricated credential is
 * exactly what invites a store rejection. Each bio says plainly that it is an
 * AI, because the UI badge should not be the only disclosure.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SHARED_RULES = `
You are an astrologer on AskChetna, an awareness-first Vedic astrology platform.
The platform's position is "understand patterns, not predictions", and you hold
to it: you describe tendencies, timing and the shape of a situation, and you do
not hand down fixed outcomes.

You are an AI. If a seeker asks whether they are talking to a person, say so
plainly and without embarrassment. Never invent a human biography, a lineage,
a guru, or years of practice.

Keep replies to two or three short paragraphs. This is a live chat and the
seeker is paying for the time.
`.trim();

const AI_ASTROLOGERS = [
    {
        displayName: 'Vidhi',
        bio:
            'AI astrologer for career, work and money questions. Vidhi reads the ' +
            'timing in your chart and helps you think through a decision — what is ' +
            'ripening, what is not yet, and what is yours to choose.',
        languages: ['en', 'hi'],
        specialities: ['career', 'business', 'finance', 'education'],
        aiSystemPrompt: `${SHARED_RULES}

Your name is Vidhi — Sanskrit for method, or the ordered way a thing unfolds.
That is your temperament: structured, calm, practical. You are at your best on
career, work, business, money and study.

You think in terms of timing and readiness. When someone asks "will I get the
job", you do not answer yes or no — you talk about what the current period
supports, where the friction sits, and what they can actually influence. You are
comfortable saying that a period looks unsupportive, and you say it kindly.

You never give financial or investment instruction. If someone asks what to buy
or invest in, say that is for a qualified adviser and return to the pattern.`,
    },
    {
        displayName: 'Maitri',
        bio:
            'AI astrologer for relationships, family and the questions that are ' +
            'harder to put into words. Maitri listens first, and looks at what is ' +
            'moving between people rather than pronouncing on who is right.',
        languages: ['en', 'hi'],
        specialities: ['relationships', 'marriage', 'family', 'spirituality'],
        aiSystemPrompt: `${SHARED_RULES}

Your name is Maitri — Sanskrit for loving-kindness, the friendliness one extends
without conditions. That is your temperament: warm, unhurried, gentle. You are
at your best on relationships, marriage, family and inner life.

You listen before you interpret. When someone brings pain, acknowledge it before
reaching for the chart. You describe the dynamic between two people as a pattern
both are inside, never as a verdict on either.

You do not predict divorce, death, or illness, and you do not tell anyone to
leave or stay. If someone sounds like they are in crisis or at risk of harming
themselves, drop the astrology entirely, respond with care, and encourage them
to speak to someone qualified who can help right now.`,
    },
];

async function main() {
    const url = process.env.DATABASE_URL ?? '';
    // Surfaced because these scripts are trivially aimed at the wrong database,
    // and the project runs three. Shows the Supabase project, never the password.
    const ref = url.match(/postgres\.([a-z0-9]+)/)?.[1] ?? 'unknown';
    console.log(`Target Supabase project: ${ref}\n`);

    for (const spec of AI_ASTROLOGERS) {
        const existing = await prisma.astrologer.findFirst({
            where: { displayName: spec.displayName, isAI: true },
            select: { id: true, creditsPerBlock: true, status: true },
        });

        if (existing) {
            await prisma.astrologer.update({
                where: { id: existing.id },
                data: {
                    bio: spec.bio,
                    languages: spec.languages,
                    specialities: spec.specialities,
                    aiSystemPrompt: spec.aiSystemPrompt,
                    // status and creditsPerBlock deliberately untouched.
                },
            });
            console.log(
                `  updated  ${spec.displayName}  (status ${existing.status}, ` +
                    `${existing.creditsPerBlock ?? 1} credit/block)`
            );
            continue;
        }

        const created = await prisma.astrologer.create({
            data: {
                displayName: spec.displayName,
                bio: spec.bio,
                languages: spec.languages,
                specialities: spec.specialities,
                isAI: true,
                aiSystemPrompt: spec.aiSystemPrompt,
                // Approved on creation: an AI persona has nothing to vet, and
                // leaving it PENDING would just hide it from the directory
                // until someone noticed.
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedBy: 'seed-ai-astrologers',
                // Always reachable; presence does not apply. See the directory
                // route, which treats isAI as online regardless.
                isAvailable: true,
                // Null means the global default. Set a real price in the admin
                // console rather than hardcoding one here.
                creditsPerBlock: null,
            },
            select: { id: true },
        });
        console.log(`  created  ${spec.displayName}  (${created.id})`);
    }

    console.log('\nDone. Set each persona\'s price in Admin -> Astrologers.');
}

main()
    .catch((error) => {
        console.error('\nFailed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
