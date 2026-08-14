#!/usr/bin/env node
/**
 * Bumps the patch version on EVERY commit, from a pre-commit hook.
 *
 * The bump lands inside your own commit, so Vercel deploys the right number the
 * first time and no bot ever pushes to a branch that auto-deploys.
 *
 * This used to bump once per PUSH: it compared the local version against the
 * tracking branch and stood down while local was ahead, so three commits pushed
 * together shared one number. That was deliberate — a version identified a
 * deployment, and three commits in one push are one deployment — but it made
 * the number look stuck while a branch sat unpushed, and that confusion was not
 * worth the tidiness. Every commit now gets its own number.
 *
 * The trade, stated plainly so it is not a surprise later: version numbers no
 * longer map one-to-one onto deployments. `git log --grep='\[v3\.3\.2\]'` now
 * answers "which commit was 3.3.2", not "what shipped in 3.3.2" — several
 * numbers can exist between two deploys, and the deployed one is whichever
 * commit was at the head of the push. /api/version still reports the buildId,
 * which is the commit SHA, and that remains the exact answer to "what is live".
 *
 * `npm run release:minor` (or :major) still works. It sets the version ahead of
 * HEAD, and the check below stands down for that one commit rather than for the
 * whole push cycle.
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

    // No upstream lookup any more. It existed to answer "has this push cycle
    // already bumped?", which is not the question now — and it made the hook
    // stand down entirely on a branch that had never been pushed.
    const local = JSON.parse(readFileSync('package.json', 'utf8'));
    // Has the version already been set deliberately for THIS commit? That is
    // what `npm run release:minor` does, and it must not be patched back down
    // to x.y.1 a second later. Comparing against HEAD rather than against the
    // upstream branch is the difference: HEAD is "the last commit", so this
    // stands down for one commit only, instead of for the whole push cycle.
    let headVersion = null;
    try {
        headVersion = JSON.parse(git('show HEAD:package.json')).version;
    } catch {
        // No HEAD yet (the very first commit), so nothing to compare against.
    }

    if (headVersion && local.version !== headVersion) {
        say(`version already set to ${local.version} for this commit (HEAD is ${headVersion}) — leaving it.`);
        process.exit(0);
    }

    const [major, minor, patch] = local.version.split('.').map(Number);
    if ([major, minor, patch].some(Number.isNaN)) {
        say(`could not parse "${local.version}" — skipping.`);
        process.exit(0);
    }
    const next = `${major}.${minor}.${patch + 1}`;
    const previous = local.version;

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
    say(`${previous} -> ${next}  (android versionCode ${versionCode})`);
    say(`run "npm run release:minor" or ":major" before committing to override.`);
} catch (error) {
    say(`skipped: ${error.message.split('\n')[0]}`);
}

process.exit(0);
