import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = [];
const logo = await readFile('apps/web/public/brand/caelora-logo.webp');
for (const width of [480, 640, 1000]) {
  const filename = `apps/web/public/brand/caelora-hero-${width}.webp`;
  await sharp(logo).resize({ width }).webp({ quality: 72, effort: 6 }).toFile(filename);
  files.push({
    filename,
    width,
    bytes: (await stat(filename)).size,
    source: 'apps/web/public/brand/caelora-logo.webp',
    sha256: createHash('sha256').update(logo).digest('hex'),
  });
}
const compact = await readFile('apps/web/public/brand/caelora-wordmark.webp');
for (const width of [240, 360, 480]) {
  const filename = `apps/web/public/brand/caelora-nav-${width}.webp`;
  await sharp(compact).resize({ width }).webp({ quality: 80, effort: 6 }).toFile(filename);
  files.push({
    filename,
    width,
    bytes: (await stat(filename)).size,
    source: 'apps/web/public/brand/caelora-wordmark.webp',
    sha256: createHash('sha256').update(compact).digest('hex'),
  });
}
const valley = await readFile('apps/web/public/media/valley-1672.webp');
for (const format of ['avif', 'webp']) {
  const filename = `apps/web/public/media/valley-mobile-600.${format}`;
  await sharp(valley)
    .extract({ left: 850, top: 0, width: 600, height: 941 })
    .toFormat(format, { quality: format === 'avif' ? 54 : 82, effort: 6 })
    .toFile(filename);
  files.push({
    filename,
    width: 600,
    height: 941,
    bytes: (await stat(filename)).size,
    crop: { left: 850, top: 0, width: 600, height: 941 },
    source: 'apps/web/public/media/valley-1672.webp',
    sha256: createHash('sha256').update(valley).digest('hex'),
  });
}
await writeFile(
  'packages/shared-assets/m3-5-priority-assets.json',
  JSON.stringify(files, null, 2) + '\n',
);
console.log(files.map((f) => ({ file: f.filename, bytes: f.bytes })));
