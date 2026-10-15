import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const source = 'D:/Caelora-menu/game-client/Assets/Caelora/UI/Menu/caelora-logo.png';
const input = await readFile(source);
const directory = new URL('../apps/web/public/brand/', import.meta.url);
await mkdir(directory, { recursive: true });
const trimmed = await sharp(input).trim().toBuffer();
const dimensions = await sharp(trimmed).metadata();
await writeFile(
  new URL('caelora-logo.webp', directory),
  await sharp(trimmed).resize(1000).webp({ quality: 92 }).toBuffer(),
);
const compactHeight = Math.round(dimensions.height * 0.86);
await writeFile(
  new URL('caelora-wordmark.webp', directory),
  await sharp(trimmed)
    .extract({ left: 0, top: 0, width: dimensions.width, height: compactHeight })
    .resize(480)
    .webp({ quality: 92 })
    .toBuffer(),
);
await writeFile(
  new URL('../packages/shared-assets/brand-manifest.json', import.meta.url),
  JSON.stringify(
    {
      source,
      sha256: createHash('sha256').update(input).digest('hex'),
      width: dimensions.width,
      height: dimensions.height,
      compactHeight,
      provenance: 'Caelora-menu ADR-0025 documented production wordmark; originals unchanged',
    },
    null,
    2,
  ) + '\n',
);
console.log('Prepared genuine Caelora wordmark derivatives; source unchanged.');
