/**
 * Rasterises the brand SVGs in mobile/assets/src/ into the PNGs that
 * @capacitor/assets consumes, and the PWA icon sizes the web manifest wants.
 *
 * Why rasterise here instead of handing SVGs straight to @capacitor/assets:
 * its SVG support varies by version, whereas PNG input is unambiguous. sharp is
 * already present as a dependency of @capacitor/assets.
 *
 * Outputs
 *   mobile/assets/icon.png             1024   iOS icon + Android legacy/round
 *   mobile/assets/icon-foreground.png  1024   Android adaptive foreground
 *   mobile/assets/icon-background.png  1024   Android adaptive background
 *   mobile/assets/splash.png           2732   splash (centre-cropped)
 *   mobile/assets/splash-dark.png      2732   dark splash (same art; dark is default)
 *   public/icons/icon-192.png           192   PWA / web manifest
 *   public/icons/icon-512.png           512   PWA / web manifest
 *   public/icons/maskable-512.png       512   PWA maskable (padded safe zone)
 *
 * Then run:  npx capacitor-assets generate
 * Or both:   npm run assets
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'mobile', 'assets', 'src');
const assetsDir = join(root, 'mobile', 'assets');
const webIconsDir = join(root, 'public', 'icons');

/** [source svg, output path, pixel size] */
const targets = [
    ['icon.svg', join(assetsDir, 'icon.png'), 1024],
    ['icon-foreground.svg', join(assetsDir, 'icon-foreground.png'), 1024],
    ['icon-background.svg', join(assetsDir, 'icon-background.png'), 1024],
    ['splash.svg', join(assetsDir, 'splash.png'), 2732],
    // Dark is the app's default theme, so the dark splash is the same artwork.
    // The file must still exist or @capacitor/assets skips dark-mode variants.
    ['splash.svg', join(assetsDir, 'splash-dark.png'), 2732],

    ['icon.svg', join(webIconsDir, 'icon-192.png'), 192],
    ['icon.svg', join(webIconsDir, 'icon-512.png'), 512],
    // Maskable uses the padded foreground over the solid background, so Android
    // and Chrome can crop to any shape without clipping the ring.
    ['icon-foreground.svg', join(webIconsDir, 'maskable-512.png'), 512],
];

async function render(svgName, outPath, size) {
    const svg = await readFile(join(srcDir, svgName));

    let pipeline = sharp(svg, { density: 384 }).resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    // The maskable variant needs an opaque brand background behind the
    // transparent foreground layer.
    if (outPath.endsWith('maskable-512.png')) {
        pipeline = pipeline.flatten({ background: '#0B0F2F' });
    }

    const buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, buffer);

    const meta = await sharp(buffer).metadata();
    return { size: buffer.length, width: meta.width, height: meta.height };
}

let failed = 0;

for (const [svgName, outPath, size] of targets) {
    try {
        const result = await render(svgName, outPath, size);
        const relative = outPath.replace(root, '').replace(/\\/g, '/').replace(/^\//, '');
        const ok = result.width === size && result.height === size;
        if (!ok) failed += 1;
        console.log(
            `${ok ? 'OK  ' : 'BAD '} ${relative.padEnd(42)} ${result.width}x${result.height}  ${(result.size / 1024).toFixed(1)} KB`
        );
    } catch (error) {
        failed += 1;
        console.error(`FAIL ${svgName} -> ${outPath}: ${error.message}`);
    }
}

console.log(failed === 0 ? '\nAll assets rendered.' : `\n${failed} asset(s) failed.`);
process.exit(failed ? 1 : 0);
