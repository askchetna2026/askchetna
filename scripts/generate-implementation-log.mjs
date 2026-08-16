#!/usr/bin/env node
/**
 * Regenerates the implementation record from git history.
 *
 * Writes docs/IMPLEMENTATION-LOG.md (readable) and .csv (opens in Excel).
 * Derived from `git log` every time rather than appended to, so the record can
 * never drift from the history it describes — and so a rebase, an amend or a
 * reworded subject is reflected instead of leaving a stale line behind.
 *
 * FULL history by default. Pass a number to limit it:
 *   node scripts/generate-implementation-log.mjs 100
 *
 * Run automatically by .husky/post-commit, which regenerates and stages the
 * files. That means the COMMITTED copy is current as of the PREVIOUS commit —
 * a file has to be written before the commit that contains it exists, so the
 * one being made cannot describe itself. `npm run log:update` closes that gap.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const limit = process.argv[2] && /^\d+$/.test(process.argv[2]) ? `-${process.argv[2]}` : '';

/** ASCII unit separator — cannot occur in a commit subject, so splitting is safe. */
const UNIT = '\x1f';

/** conventional-commit type -> a word someone outside the codebase can file under */
const KIND = {
    feat: 'Feature',
    fix: 'Bug fix',
    perf: 'Performance',
    refactor: 'Refactor',
    style: 'UI / styling',
    docs: 'Documentation',
    chore: 'Maintenance',
    build: 'Build / tooling',
    test: 'Tests',
    ci: 'Build / tooling',
    ui: 'UI / styling',
};

/** commit scope -> the product surface a reader would recognise */
const AREA = {
    consult: 'Consultations', consultations: 'Consultations',
    chart: 'Birth chart', charts: 'Birth chart',
    timing: 'Timing & seasons',
    clarity: 'Ask Chetna AI',
    home: 'Home',
    today: 'Today screen',
    journal: 'Journal',
    glossary: 'Glossary', term: 'Glossary',
    explore: 'Explore',
    synastry: 'Relationships',
    daily: 'Daily insight', 'daily-insight': 'Daily insight',
    prompts: 'AI prompts', ai: 'AI',
    api: 'API', auth: 'Auth', app: 'Mobile app',
    css: 'Design system', type: 'Typography', ui: 'UI',
    a11y: 'Accessibility', nav: 'Navigation',
    engine: 'Astrology engine', astrology: 'Astrology', transit: 'Transits',
    profiles: 'Profiles', analytics: 'Analytics',
    update: 'App updates', ops: 'Operations', env: 'Environment',
    version: 'Versioning', build: 'Build',
};

/**
 * Type for a subject written before conventional commits were adopted —
 * roughly a third of this history. Leaving those as "Other" would make the
 * summary useless for exactly the period someone is most likely to be
 * reconstructing.
 *
 * Order matters: "Fix build errors: Refactor pages" is a fix that happens to
 * mention refactoring and building, so the repair verbs are tested first.
 *
 * Word boundaries throughout. Without them "ci" matches "specific" and "ui"
 * matches "build", which mistypes most of the history and does so silently.
 */
function classifyByWords(subject) {
    const t = subject.toLowerCase();
    if (/\b(fix|fixes|fixed|hotfix|bugfix|resolves?|resolved|corrects?|corrected|prevents?|prevented|repair|restores?|restored)\b/.test(t)) return 'Bug fix';
    if (/\b(refactor|refactors|refactored|refactoring|cleanup|renames?|renamed)\b|\bclean up\b/.test(t)) return 'Refactor';
    if (/\b(perf|performance|optimise|optimize|optimised|optimized|optimisation|optimization)\b|\bspeed up\b/.test(t)) return 'Performance';
    if (/\b(ui|ux|redesign|polish|styling|layout|responsive)\b/.test(t)) return 'UI / styling';
    if (/\b(doc|docs|readme|document|documents|documented|documentation)\b/.test(t)) return 'Documentation';
    if (/\b(test|tests|testing)\b/.test(t)) return 'Tests';
    if (/\b(build|deploy|deployment|ci|config|upgrade|upgraded|bump|dependency|dependencies)\b/.test(t)) return 'Build / tooling';
    if (/\b(add|adds|added|implement|implements|implemented|introduce|introduced|enhance|enhanced|create|created|support|enable|enabled|new|overhaul|refine[ds]?|strengthen|harden)\b|\brate-limit\b/.test(t)) return 'Feature';
    if (/\b(chore|remove|removed|delete|deleted|update|updated)\b/.test(t)) return 'Maintenance';
    return 'Other';
}

function read() {
    const raw = execSync(
        `git log ${limit} --date=short --pretty=format:%ad${UNIT}%s${UNIT}%h`,
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );

    return raw.split('\n').filter((l) => l.trim()).map((line) => {
        const [date, subjectRaw, hash] = line.split(UNIT);

        // The [vX.Y.Z] stamp the prepare-commit-msg hook appends.
        const version = (subjectRaw.match(/\[(v[\d.]+)\]\s*$/) || [])[1] ?? '';
        const subject = subjectRaw.replace(/\s*\[v[\d.]+\]\s*$/, '').trim();

        const m = subject.match(/^([a-zA-Z-]+)(?:\(([^)]+)\))?:\s*(.+)$/);
        let kind = 'Other';
        let area = '';
        let name = subject;

        if (m) {
            const [, type, scope, desc] = m;
            kind = KIND[type.toLowerCase()] ?? 'Other';
            name = desc;
            if (scope) {
                area = scope
                    .split(',')
                    .map((s) => AREA[s.trim().toLowerCase()] ?? s.trim())
                    .join(' / ');
            }
        }

        if (kind === 'Other') kind = classifyByWords(subject);

        return {
            date,
            kind,
            area,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            version,
            hash,
        };
    });
}

const rows = read();
if (!rows.length) {
    console.log('implementation-log: no commits found; nothing written.');
    process.exit(0);
}

mkdirSync('docs', { recursive: true });

const counts = rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
const byType = Object.entries(counts).sort((a, b) => b[1] - a[1]);

// ── CSV ─────────────────────────────────────────────────────────────────────
// Leading BOM so Excel reads it as UTF-8; without it the em-dashes and any
// Devanagari in a subject arrive as mojibake.
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv =
    '﻿' +
    [
        ['Date', 'Type', 'Area', 'What was implemented', 'Version', 'Commit'].map(esc).join(','),
        ...rows.map((r) => [r.date, r.kind, r.area, r.name, r.version, r.hash].map(esc).join(',')),
    ].join('\r\n') +
    '\r\n';
writeFileSync('docs/IMPLEMENTATION-LOG.csv', csv, 'utf8');

// ── Markdown ────────────────────────────────────────────────────────────────
// One early subject is an entire changelog flattened onto a line. The CSV keeps
// it whole; the table truncates so a column stays a column.
const cell = (s) => {
    const short = s.length > 120 ? `${s.slice(0, 117).trimEnd()}…` : s;
    return short.replace(/\|/g, '\\|');
};

const md = [
    '# AskChetna — implementation record',
    '',
    'Every commit, newest first. **Generated — do not edit by hand.**',
    'Regenerated by `.husky/post-commit`, or on demand with `npm run log:update`.',
    '',
    `${rows.length} commits, ${rows[rows.length - 1].date} to ${rows[0].date}.`,
    '',
    '## By type',
    '',
    '| Type | Count |',
    '|---|---|',
    ...byType.map(([k, n]) => `| ${k} | ${n} |`),
    '',
    '## Every change',
    '',
    '| Date | Type | Area | What was implemented | Version | Commit |',
    '|---|---|---|---|---|---|',
    ...rows.map(
        (r) => `| ${r.date} | ${r.kind} | ${r.area} | ${cell(r.name)} | ${r.version} | \`${r.hash}\` |`
    ),
    '',
    '---',
    '',
    'The version column is **not** a release marker. Since 2026-08-14 the patch',
    'bumps on every commit, so consecutive numbers are commits rather than',
    'releases; before that date several commits share one number. What identifies',
    'a deployment is the commit hash — `/api/version` reports it as `buildId`.',
    '',
].join('\n');
writeFileSync('docs/IMPLEMENTATION-LOG.md', md, 'utf8');

console.log(
    `implementation-log: ${rows.length} commits ` +
    `(${rows[rows.length - 1].date}..${rows[0].date}) — ` +
    byType.map(([k, n]) => `${k} ${n}`).join(', ')
);
