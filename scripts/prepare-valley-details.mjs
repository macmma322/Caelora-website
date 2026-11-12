import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Workstation-only recipe. Sources are read, never modified; a normal clone builds from the
// committed derivatives and does not need these paths. See packages/shared-assets/README.md.
const sources = {
  valley:
    process.env.CAELORA_VALLEY_SOURCE ??
    'D:/Caelora/game-client/Assets/Caelora/Client/FrontEnd/Presentation/Resources/FrontEnd/MenuPlate.png',
  atlas:
    process.env.CAELORA_ATLAS_SOURCE ?? 'C:/Users/nikol/Downloads/Caelora Fantasy Atlas Map.png',
};
// Each detail is a crop of the one 3840x2160 valley master: distinct places inside one painting.
const crops = [
  // The whole plate: the explorable home painting. Place crops below are regions of it.
  { name: 'plate', source: 'valley', crop: [0, 0, 3840, 2160], widths: [1280, 1920, 2560] },
  { name: 'wilds', source: 'valley', crop: [420, 0, 2240, 820], widths: [800, 1440, 2240] },
  { name: 'hearth', source: 'valley', crop: [0, 330, 1130, 1830], widths: [480, 760, 1130] },
  { name: 'village', source: 'valley', crop: [2240, 880, 1600, 900], widths: [800, 1600] },
  { name: 'castle', source: 'valley', crop: [2260, 40, 1580, 900], widths: [800, 1580] },
  // The atlas loses only its interface tab row; the map spread itself is unchanged.
  { name: 'atlas-folio', source: 'atlas', crop: [0, 146, 1448, 940], widths: [720, 1440] },
];
const media = new URL('../apps/web/public/media/', import.meta.url);
const manifest = [];
for (const item of crops) {
  const original = await readFile(sources[item.source]);
  const [left, top, width, height] = item.crop;
  const outputs = [];
  for (const size of item.widths) {
    for (const format of ['avif', 'webp']) {
      const filename = `${item.name}-${size}.${format}`;
      const file = fileURLToPath(new URL(filename, media));
      const image = sharp(original).extract({ left, top, width, height }).resize({ width: size });
      await (
        format === 'avif'
          ? image.avif({ quality: 58, effort: 6 })
          : image.webp({ quality: 78, effort: 6 })
      ).toFile(file);
      const meta = await sharp(file).metadata();
      outputs.push({
        filename,
        width: meta.width,
        height: meta.height,
        bytes: (await stat(file)).size,
      });
    }
  }
  manifest.push({
    name: item.name,
    source: sources[item.source],
    sha256: createHash('sha256').update(original).digest('hex'),
    crop: { left, top, width, height },
    operation: 'crop, resize and compress only; no painting, compositing or generation',
    outputs,
  });
}
// Social preview card: JPEG for platforms without WebP support.
{
  const original = await readFile(sources.valley);
  const filename = 'social-card-1200.jpg';
  const file = fileURLToPath(new URL(filename, media));
  await sharp(original)
    .extract({ left: 0, top: 136, width: 3840, height: 2016 })
    .resize({ width: 1200, height: 630 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(file);
  manifest.push({
    name: 'social-card',
    source: sources.valley,
    sha256: createHash('sha256').update(original).digest('hex'),
    crop: { left: 0, top: 136, width: 3840, height: 2016 },
    operation: 'crop to 1.905:1, resize and compress only',
    outputs: [{ filename, width: 1200, height: 630, bytes: (await stat(file)).size }],
  });
}
await writeFile(
  new URL('../packages/shared-assets/design-evolution-derivatives.json', import.meta.url),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  manifest
    .map((m) => `${m.name}: ${m.outputs.map((o) => `${o.filename} ${o.bytes}`).join(', ')}`)
    .join('\n'),
);
