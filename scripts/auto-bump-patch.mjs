#!/usr/bin/env node
/**
 * Bumps the patch version once per push cycle, from a pre-commit hook.
 *
 * The rule is a comparison, not a counter: bump only when the local version
 * still matches what is on the tracking branch.
 *
 *   push            local == origin
 *   first commit    -> they match, so bump and stage it
 *   later commits   -> local is ahead, so do nothing
 *   push            they match again, and the cycle repeats
 *
 * That yields exactly one bump per push rather than one per commit, and the
 * bump lands inside your own commit — so Vercel deploys the right number the
 * first time and no bot ever pushes to a branch that auto-deploys.
 *
 * Running `npm run release:minor` (or :major) before committing puts the local
 * version ahead of origin, so this stands down automatically. That is the
 * "command for minor/major, nothing for patch" behaviour, with no flag to pass.
 *
 * Deliberately never blocks a commit. Every failure path exits 0: a version
 * number is not worth losing work over, and a hook that can reject your commit
 * for an unrelated reason is a hook people delete.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const say = (msg) => console.log(`[version] ${msg}`);

const git = (cmd) =>
    execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

try {
    // Mid-merge or mid-rebase, HEAD is not a place to be editing package.json.
    const gitDir = git('rev-parse --git-dir');
    for (const marker of ['MERGE_HEAD', 'REBASE_HEAD', 'CHERRY_PICK_HEAD']) {
        try {
            readFileSync(`${gitDir}/${marker}`);
            say(`${marker} present — skipping during merge/rebase.`);
            process.exit(0);
        } catch {
            // Absent, which is the normal case.
        }
    }

    // The branch this one tracks, e.g. origin/preview. No upstream means a new
    // branch that has never been pushed; there is nothing to compare against.
    let upstream;
    try {
        upstream = git('rev-parse --abbrev-ref --symbolic-full-name @{u}');
    } catch {
        say('no upstream branch — skipping.');
        process.exit(0);
    }

    const local = JSON.parse(readFileSync('package.json', 'utf8'));
    const remote = JSON.parse(git(`show ${upstream}:package.json`));

    if (local.version !== remote.version) {
        say(`already at ${local.version} vs ${upstream} ${remote.version} — no bump needed.`);
        process.exit(0);
    }

    const [major, minor, patch] = local.version.split('.').map(Number);
    if ([major, minor, patch].some(Number.isNaN)) {
        say(`could not parse "${local.version}" — skipping.`);
        process.exit(0);
    }
    const next = `${major}.${minor}.${patch + 1}`;

    // Edit the files directly rather than shelling out to `npm version`, which
    // wants a clean tree and would fail inside a pre-commit hook.
    local.version = next;
    writeFileSync('package.json', JSON.stringify(local, null, 2) + '\n');

    try {
        const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
        lock.version = next;
        if (lock.packages?.['']) lock.packages[''].version = next;
        writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
        execSync('git add package.json package-lock.json', { stdio: 'ignore' });
    } catch {
        execSync('git add package.json', { stdio: 'ignore' });
    }

    const versionCode = major * 10000 + minor * 100 + (patch + 1);
    say(`${remote.version} -> ${next}  (android versionCode ${versionCode})`);
    say(`run "npm run release:minor" or ":major" before committing to override.`);
} catch (error) {
    say(`skipped: ${error.message.split('\n')[0]}`);
}

process.exit(0);
