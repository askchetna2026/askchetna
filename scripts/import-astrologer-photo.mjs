#!/usr/bin/env node
/**
 * Installs a supplied portrait as an astrologer's avatar.
 *
 *   node scripts/import-astrologer-photo.mjs vidhi ~/Downloads/vidhi.png
 *   npm run photo:astrologer -- maitri C:/Users/rahul/Downloads/maitri.jpg
 *
 * Takes any JPG/PNG/WebP, squares it on the face, strips metadata and writes
 * `public/art/astrologers/<slug>.webp` at the size the avatar actually needs.
 *
 * It re-encodes rather than copying for the same reasons `src/lib/photoUpload.ts`
 * does — EXIF from a phone camera carries GPS, and an image that is also a valid
 * script cannot survive a decode to raw pixels and back. A generated image has
 * neither problem today, but this path should not depend on where the file came
 * from.
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'art', 'astrologers');
const SIZE = 512;
const ACCEPTED = ['jpeg', 'jpg', 'png', 'webp'];

/** Matches the `photoUrl` values in scripts/seed-ai-astrologers.mjs. */
const KNOWN = ['vidhi', 'maitri'];

async function main() {
    const [slug, source] = process.argv.slice(2);

    if (!slug || !source) {
        console.error(
            'Usage: node scripts/import-astrologer-photo.mjs <slug> <image>\n' +
                `  slug is one of: ${KNOWN.join(', ')}`
        );
        process.exitCode = 1;
        return;
    }

    // A typo here writes art nothing points at, and the directory quietly falls
    // back to an initial — a failure that looks like nothing happened at all.
    if (!KNOWN.includes(slug)) {
        console.error(
            `Unknown astrologer "${slug}". Expected one of: ${KNOWN.join(', ')}.\n` +
                'Adding a new one means giving it a photoUrl in ' +
                'scripts/seed-ai-astrologers.mjs first.'
        );
        process.exitCode = 1;
        return;
    }

    try {
        await access(source);
    } catch {
        console.error(`Cannot read ${source}`);
        process.exitCode = 1;
        return;
    }

    const meta = await sharp(source).metadata();
    if (!meta.format || !ACCEPTED.includes(meta.format)) {
        console.error(`${source} is a ${meta.format ?? 'unrecognised'} file. Use JPG, PNG or WebP.`);
        process.exitCode = 1;
        return;
    }
    if ((meta.width ?? 0) < SIZE || (meta.height ?? 0) < SIZE) {
        console.warn(
            `Warning: source is ${meta.width}x${meta.height}, below ${SIZE}x${SIZE}. ` +
                'It will be upscaled and will look soft.'
        );
    }

    await mkdir(OUT_DIR, { recursive: true });
    const out = path.join(OUT_DIR, `${slug}.webp`);

    // Reading and writing one path fails deep inside sharp as "UNKNOWN: unknown
    // error", which says nothing about the actual mistake.
    if (path.resolve(source) === out) {
        console.error('Source and destination are the same file. Point at the original.');
        process.exitCode = 1;
        return;
    }

    const buf = await sharp(source)
        .rotate() // honour the orientation flag before metadata is dropped
        // `attention` crops toward the salient region, which on a portrait is
        // the face. A centre crop cuts the forehead off anything not already
        // composed square.
        .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
        .webp({ quality: 88 })
        .toBuffer();

    await writeFile(out, buf);

    console.log(
        `  ${slug}.webp  ${(buf.byteLength / 1024).toFixed(1)} KB  ` +
            `(from ${meta.width}x${meta.height} ${meta.format})`
    );
    console.log('\nRun the seed for each environment to publish it:');
    console.log('  npm run seed:ai          # local');
    console.log('  npm run seed:ai:preview');
    console.log('  npm run seed:ai:prod');
}

main().catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
});
