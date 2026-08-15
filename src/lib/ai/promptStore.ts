import fs from 'node:fs';
import path from 'node:path';

/**
 * Every prompt this app sends to a model, kept in `prompts/ai-prompts.md`
 * rather than inline in the code that sends it.
 *
 * The point is that retuning a prompt should not be a code change. Prompts get
 * edited far more often than the logic around them, by people reasoning about
 * tone and output shape rather than about TypeScript — and inline template
 * literals make that a diff through nine functions in geminiService.ts, where a
 * stray backtick breaks the build.
 *
 * The markdown file is AUTHORITATIVE. There is no inline copy to drift from it.
 * That is a deliberate trade: a malformed edit is a hard failure rather than a
 * silent fallback to a stale prompt, which is the failure mode you can actually
 * notice. `npm run prompts:check` runs in `prebuild`, so a bad edit fails the
 * build and never reaches a deployment.
 *
 * ── Placeholders ──────────────────────────────────────────────────────────
 * Templates interpolate `{{name}}`. Both directions are checked, because both
 * mistakes are easy to make while editing prose:
 *
 *   a placeholder with no value passed   -> throws, naming the placeholder
 *   a value passed with no placeholder   -> allowed
 *
 * The second is allowed on purpose: dropping `{{chart}}` from a prompt is a
 * legitimate edit ("stop sending the whole chart"), and it should not need a
 * code change to match.
 *
 * ── Caching ───────────────────────────────────────────────────────────────
 * Parsed once per process. In development the file's mtime is checked on each
 * read so an edit shows up on the next request without restarting the dev
 * server; in production it is read once, since the file cannot change under a
 * running deployment.
 */

export type PromptId =
    | 'CLARITY_ASK'
    | 'TIMING_INSIGHT'
    | 'PLANET_INSIGHTS'
    | 'PLANET_INSIGHTS_DETAIL_SIMPLE'
    | 'PLANET_INSIGHTS_DETAIL_TECHNICAL'
    | 'JOURNAL_ANALYSIS'
    | 'SYNASTRY_ANALYSIS'
    | 'REPORT_GENERATION_PART1'
    | 'REPORT_GENERATION_PART2'
    | 'CONSULTATION_REPLY'
    | 'CONSULTATION_MEMORY'
    | 'WHATSAPP_CHAT'
    | 'WHATSAPP_CHAT_CHART_CONTEXT'
    | 'WHATSAPP_CHAT_SIMPLE'
    | 'WHATSAPP_CHAT_TECHNICAL'
    | 'DAILY_INSIGHT';

/** Every id the app expects to find. `prompts:check` asserts this list resolves. */
export const REQUIRED_PROMPT_IDS: PromptId[] = [
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
    'CONSULTATION_MEMORY',
    'WHATSAPP_CHAT',
    'WHATSAPP_CHAT_CHART_CONTEXT',
    'WHATSAPP_CHAT_SIMPLE',
    'WHATSAPP_CHAT_TECHNICAL',
    'DAILY_INSIGHT',
];

export const PROMPTS_FILE = path.join(process.cwd(), 'prompts', 'ai-prompts.md');

let cache: Map<string, string> | null = null;
let cachedMtimeMs = 0;

/**
 * Pull `### ID` headings and the first ```prompt fence beneath each.
 *
 * Everything outside those fences — descriptions, tables of placeholders,
 * editing notes — is documentation and is ignored here, so the same file can be
 * read by a person and by this loader without either getting in the other's way.
 */
export function parsePrompts(markdown: string): Map<string, string> {
    const found = new Map<string, string>();

    // Split on level-3 headings; each chunk owns everything up to the next one.
    const sections = markdown.split(/^###[ \t]+/m).slice(1);

    for (const section of sections) {
        const newline = section.indexOf('\n');
        if (newline === -1) continue;

        const id = section.slice(0, newline).trim();
        const body = section.slice(newline);

        // ```prompt ... ``` — the fence language is what distinguishes a prompt
        // from an example block someone pasted into the notes.
        const fence = body.match(/^```prompt[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/m);
        if (!fence) continue;

        if (found.has(id)) {
            throw new Error(
                `[prompts] "${id}" is defined more than once in ${PROMPTS_FILE}. ` +
                `Two blocks with the same heading means one of them is silently dead.`
            );
        }

        // Trailing newline before the closing fence belongs to the fence, not
        // the prompt.
        found.set(id, fence[1].replace(/\r?\n$/, ''));
    }

    return found;
}

function load(): Map<string, string> {
    const isDev = process.env.NODE_ENV !== 'production';

    if (cache && !isDev) return cache;

    if (cache && isDev) {
        try {
            const { mtimeMs } = fs.statSync(PROMPTS_FILE);
            if (mtimeMs === cachedMtimeMs) return cache;
        } catch {
            return cache; // File vanished mid-session; keep serving what we have.
        }
    }

    let raw: string;
    try {
        raw = fs.readFileSync(PROMPTS_FILE, 'utf8');
        cachedMtimeMs = fs.statSync(PROMPTS_FILE).mtimeMs;
    } catch (error) {
        throw new Error(
            `[prompts] Could not read ${PROMPTS_FILE}. Every AI call needs it. ` +
            `On Vercel this usually means outputFileTracingIncludes in next.config.ts ` +
            `no longer covers prompts/. Original error: ${String(error)}`
        );
    }

    cache = parsePrompts(raw);
    return cache;
}

/** The raw template for an id, before placeholders are filled in. */
export function getPromptTemplate(id: PromptId): string {
    const template = load().get(id);

    if (template === undefined) {
        throw new Error(
            `[prompts] No "### ${id}" section with a \`\`\`prompt block in ${PROMPTS_FILE}.`
        );
    }

    return template;
}

/**
 * Fill a template's placeholders.
 *
 * Values are substituted literally and are NOT escaped: prompts are prose sent
 * to a model, not markup. Callers pass already-serialised chart JSON.
 */
export function renderPrompt(id: PromptId, vars: Record<string, string> = {}): string {
    const template = getPromptTemplate(id);
    const missing: string[] = [];

    const rendered = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
        if (!(key in vars)) {
            missing.push(key);
            return '';
        }
        return vars[key];
    });

    if (missing.length > 0) {
        throw new Error(
            `[prompts] "${id}" uses ${missing.map((m) => `{{${m}}}`).join(', ')}, ` +
            `which the code does not supply. Either the placeholder is a typo, or it ` +
            `needs wiring up in src/lib/ai/geminiService.ts.`
        );
    }

    return rendered;
}

/** Drop the parsed copy. For tests and for the check script. */
export function clearPromptCache() {
    cache = null;
    cachedMtimeMs = 0;
}
