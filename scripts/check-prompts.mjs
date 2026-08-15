/**
 * Fails the build if prompts/ai-prompts.md is not usable.
 *
 * The markdown file is the only copy of every prompt the app sends — there is no
 * inline fallback in geminiService.ts to quietly take over. That is the right
 * trade only if a malformed edit is caught before it ships, which is what this
 * does: it runs in `prebuild`, so Vercel's `npm run build` refuses a bad file.
 *
 * Deliberately dependency-free and a copy of the parser's contract rather than
 * an import of it: this runs before `next build`, outside the TS pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'prompts', 'ai-prompts.md');

/** Must match REQUIRED_PROMPT_IDS in src/lib/ai/promptStore.ts. */
const REQUIRED = [
    'CLARITY_ASK',
    'TIMING_INSIGHT',
    'PLANET_INSIGHTS',
    'PLANET_INSIGHTS_DETAIL_SIMPLE',
    'PLANET_INSIGHTS_DETAIL_TECHNICAL',
    'JOURNAL_ANALYSIS',
    'SYNASTRY_ANALYSIS',
    'REPORT_GENERATION_PART1',
    'REPORT_GENERATION_PART2',
    'CONSULTATION_REPLY',
    'WHATSAPP_CHAT',
    'WHATSAPP_CHAT_CHART_CONTEXT',
    'WHATSAPP_CHAT_SIMPLE',
    'WHATSAPP_CHAT_TECHNICAL',
    'DAILY_INSIGHT',
];

/**
 * Every placeholder the code supplies, per id. A prompt may use fewer — dropping
 * `{{chart}}` is a legitimate edit — but may not invent one, because nothing
 * would fill it.
 */
const SUPPLIED = {
    DAILY_INSIGHT: ['name', 'weekday', 'dashaLord', 'moonSign', 'chart', 'patterns'],
    TIMING_INSIGHT: ['dashaLord', 'dashaStart', 'dashaEnd', 'chart', 'analysis', 'yogas'],
    JOURNAL_ANALYSIS: ['content', 'dashaLord', 'antardasha', 'chart', 'analysis', 'yogas'],
    SYNASTRY_ANALYSIS: ['nameA', 'nameB', 'chartA', 'chartB', 'analysisA', 'analysisB', 'yogasA', 'yogasB'],
    PLANET_INSIGHTS: ['chartName', 'chart', 'analysis', 'yogas', 'detailInstructions'],
    PLANET_INSIGHTS_DETAIL_SIMPLE: [],
    PLANET_INSIGHTS_DETAIL_TECHNICAL: [],
    CLARITY_ASK: ['chart', 'timing', 'question', 'analysis', 'yogas'],
    CONSULTATION_REPLY: ['persona', 'transcript', 'message'],
    REPORT_GENERATION_PART1: ['name', 'chart', 'analysis', 'yogas'],
    REPORT_GENERATION_PART2: ['name', 'chart', 'analysis', 'yogas'],
    WHATSAPP_CHAT: ['chartContext', 'complexityInstruction', 'message'],
    WHATSAPP_CHAT_CHART_CONTEXT: ['ascendant', 'moonSign'],
    WHATSAPP_CHAT_SIMPLE: [],
    WHATSAPP_CHAT_TECHNICAL: [],
};

/**
 * Markers the code parses back out of the model's answer. Removing one does not
 * break the build — the caller falls back to a canned string — but it silently
 * replaces real content with boilerplate, which is worth a warning.
 */
const EXPECTED_MARKERS = {
    DAILY_INSIGHT: ['HEADLINE:', 'BODY:', 'FOCUS:', 'CAUTION:'],
    TIMING_INSIGHT: ['PHASE_FLAVOR:', 'OPPORTUNITY:', 'AWARENESS_PRACTICE:'],
    JOURNAL_ANALYSIS: ['CORRELATION:', 'ASTROLOGICAL CONTEXT:', 'GROWTH SUGGESTION:'],
    SYNASTRY_ANALYSIS: ['OVERVIEW:', 'MAGNETIC PULL:', 'GROWTH EDGES:', 'COMMUNICATION:', 'HARMONY TIPS:'],
    CLARITY_ASK: ['SECTION B', 'SECTION BA', 'SECTION C', 'SECTION D', 'SECTION E', 'SECTION F'],
};

function parsePrompts(markdown) {
    const found = new Map();
    const sections = markdown.split(/^###[ \t]+/m).slice(1);

    for (const section of sections) {
        const newline = section.indexOf('\n');
        if (newline === -1) continue;

        const id = section.slice(0, newline).trim();
        const body = section.slice(newline);
        const fence = body.match(/^```prompt[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/m);
        if (!fence) continue;

        if (found.has(id)) {
            console.error(`  x ${id} is defined twice — one block is silently dead.`);
            process.exit(1);
        }
        found.set(id, fence[1].replace(/\r?\n$/, ''));
    }

    return found;
}

let raw;
try {
    raw = fs.readFileSync(FILE, 'utf8');
} catch {
    console.error(`\nprompts:check FAILED — cannot read ${FILE}\n`);
    process.exit(1);
}

const prompts = parsePrompts(raw);
const errors = [];
const warnings = [];

for (const id of REQUIRED) {
    const template = prompts.get(id);

    if (template === undefined) {
        errors.push(`${id}: no "### ${id}" heading with a \`\`\`prompt block.`);
        continue;
    }

    if (template.trim() === '') {
        errors.push(`${id}: the prompt block is empty.`);
        continue;
    }

    const used = [...template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
    const supplied = SUPPLIED[id] ?? [];

    for (const name of new Set(used)) {
        if (!supplied.includes(name)) {
            errors.push(
                `${id}: uses {{${name}}}, which the code does not supply. ` +
                `Available here: ${supplied.length ? supplied.map((s) => `{{${s}}}`).join(', ') : '(none)'}`
            );
        }
    }

    for (const marker of EXPECTED_MARKERS[id] ?? []) {
        if (!template.includes(marker)) {
            warnings.push(
                `${id}: no "${marker}" in the prompt. The parser looks for it; ` +
                `without it users get the fallback string instead of real content.`
            );
        }
    }
}

const extra = [...prompts.keys()].filter((id) => !REQUIRED.includes(id));
for (const id of extra) {
    warnings.push(`${id}: defined but never used by the app. Harmless, but dead.`);
}

for (const w of warnings) console.warn(`  ! ${w}`);

if (errors.length > 0) {
    console.error(`\nprompts:check FAILED (${errors.length}):\n`);
    for (const e of errors) console.error(`  x ${e}`);
    console.error(`\nFix ${path.relative(process.cwd(), FILE)} and try again.\n`);
    process.exit(1);
}

console.log(
    `prompts:check ok — ${REQUIRED.length} prompts resolve` +
    (warnings.length ? `, ${warnings.length} warning(s)` : '')
);
