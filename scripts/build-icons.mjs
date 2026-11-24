// Renders the PNG app icons and the default share image (og:image) from
// public/favicon.svg. Run after changing the logo: `pnpm build:icons`.
//
// The favicon has rounded corners; the app icons are full-bleed squares because
// iOS and Android round or mask them themselves. The maskable icon shrinks the
// bird to 80% so it stays inside the safe zone when Android crops it to a circle.

import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile('public/favicon.svg', 'utf8');
const square = svg.replace(/ rx="[\d.]+"/, '');
const maskable = square.replace(
  /(<rect width="64" height="64"[^>]*\/>)([\s\S]*)<\/svg>/,
  '$1<g transform="translate(32 32) scale(0.8) translate(-32 -32)">$2</g></svg>',
);

const icons = [
  ['public/apple-touch-icon.png', square, 180],
  ['public/icon-192.png', square, 192],
  ['public/icon-512.png', square, 512],
  ['public/icon-maskable-512.png', maskable, 512],
];

for (const [file, source, size] of icons) {
  await sharp(Buffer.from(source), { density: (72 * size) / 64 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(file);
}

// Default link preview image (og:image) for pages without a bird photo of their own:
// logo and name on the page background, 1200×630 as Facebook and others want.
const inner = svg.trim().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const share = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fbfbf9"/>
  <svg x="160" y="195" width="240" height="240" viewBox="0 0 64 64">${inner}</svg>
  <text x="450" y="352" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="110" font-weight="600" letter-spacing="-2" fill="#1b1c1e">Fuglebilder</text>
</svg>`;
await sharp(Buffer.from(share)).png({ compressionLevel: 9 }).toFile('public/og-image.png');
console.log('public/og-image.png');
