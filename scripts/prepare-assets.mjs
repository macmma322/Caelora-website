// Explicit, repeatable optimization of existing user-supplied art. Originals are read-only.
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const destination = new URL('../apps/web/public/media/', import.meta.url);
await mkdir(destination, { recursive: true });
const sources = [
  {
    path: 'D:/Caelora/art/main-menu-loop/master/Caelora_MainMenu_Static.png',
    name: 'valley',
    sizes: [640, 960, 1672],
  },
  {
    path: 'C:/Users/nikol/Downloads/Voxel Dragon Concept Sheet.png',
    name: 'dragon',
    sizes: [640, 960],
    crop: { left: 0, top: 0, width: 1122, height: 982 },
  },
  {
    path: 'C:/Users/nikol/Downloads/Caelora Fantasy Atlas Map.png',
    name: 'atlas',
    sizes: [640, 960],
  },
];
const manifest = [];
for (const source of sources) {
  const bytes = await readFile(source.path);
  const outputs = [];
  for (const width of source.sizes) {
    let pipeline = sharp(bytes);
    if (source.crop) pipeline = pipeline.extract(source.crop);
    const filename = `${source.name}-${width}.webp`;
    const result = await pipeline
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 84, effort: 5 })
      .toFile(fileURLToPath(new URL(filename, destination)));
    outputs.push({ filename, width: result.width, height: result.height, bytes: result.size });
  }
  manifest.push({
    source: source.path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    crop: source.crop ?? null,
    outputs,
  });
}
await mkdir(new URL('../apps/web/public/fonts/', import.meta.url), { recursive: true });
await mkdir(new URL('../packages/shared-assets/licenses/', import.meta.url), { recursive: true });
await copyFile(
  'D:/Caelora-menu/art/ui/fonts/cinzel/Cinzel[wght].ttf',
  new URL('../apps/web/public/fonts/cinzel-variable.ttf', import.meta.url),
);
await copyFile(
  'D:/Caelora-menu/art/ui/fonts/cinzel/OFL.txt',
  new URL('../packages/shared-assets/licenses/Cinzel-OFL.txt', import.meta.url),
);
await writeFile(
  new URL('../packages/shared-assets/asset-manifest.json', import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log('Prepared optimized concept artwork and licensed Cinzel. No source files changed.');
