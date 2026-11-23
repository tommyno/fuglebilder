// Renders the PNG app icons from public/favicon.svg. Run after changing the logo:
// `pnpm build:icons`.
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
