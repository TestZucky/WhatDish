/**
 * Regenerate the raster icon set from the SVG sources.
 *   node scripts/generate-icons.mjs   (or: npm run generate-icons)
 *
 * Sources:
 *   public/favicon.svg          — rounded brand mark (browser tabs, .ico)
 *   scripts/icon-maskable.svg    — full-bleed variant (Apple/Android home screens)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const rounded = readFileSync(join(pub, 'favicon.svg'));
const maskable = readFileSync(join(root, 'scripts', 'icon-maskable.svg'));

const png = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

// Rounded mark -> multi-resolution favicon.ico (16/32/48)
const icoSizes = await Promise.all([16, 32, 48].map((s) => png(rounded, s)));
writeFileSync(join(pub, 'favicon.ico'), await pngToIco(icoSizes));

// Full-bleed -> home-screen / PWA icons
for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['web-app-manifest-192x192.png', 192],
  ['web-app-manifest-512x512.png', 512],
]) {
  writeFileSync(join(pub, name), await png(maskable, size));
}

console.log('✓ icons written to public/');
