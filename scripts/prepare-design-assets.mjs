import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Read existing committed derivatives only; original workstation artwork is never modified.
const directory = new URL('../apps/web/public/media/', import.meta.url);
const inputs = [
  { name: 'valley', source: 'valley-1672.webp', widths: [640, 960, 1672] },
  { name: 'dragon', source: 'dragon-960.webp', widths: [640, 960] },
  { name: 'atlas', source: 'atlas-960.webp', widths: [640, 960] },
];
const manifest = [];
for (const input of inputs) {
  const source = await readFile(new URL(input.source, directory));
  const outputs = [];
  for (const width of input.widths) {
    const filename = `${input.name}-${width}.avif`;
    const file = new URL(filename, directory);
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 62, effort: 6 })
      .toFile(fileURLToPath(file));
    outputs.push({ filename, width, bytes: (await stat(file)).size });
  }
  manifest.push({
    source: input.source,
    sha256: createHash('sha256').update(source).digest('hex'),
    operation: 'resize/compress only; original composition unchanged',
    outputs,
  });
}
await writeFile(
  new URL('../packages/shared-assets/m3-5-derivatives.json', import.meta.url),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log('Prepared responsive AVIF derivatives; WebP fallbacks retained.');
