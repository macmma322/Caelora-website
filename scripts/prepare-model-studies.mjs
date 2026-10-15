import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

const studies = [
  {
    name: 'falcon',
    source: 'D:/Caelora-source-assets/Bonds/Falcon/Meshy_AI_Block_Falcon_1009091117_texture.blend',
    triangles: 3178946,
  },
  {
    name: 'wolf',
    source: 'D:/Caelora-source-assets/Bonds/Wolf/Meshy_AI_Blockfur_Wolf_1009090039_texture.blend',
    triangles: 2339845,
  },
];
const manifest = [];
for (const study of studies) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(study.source)) hash.update(chunk);
  const render = await readFile(`artifacts/m3-5/renders/${study.name}.png`);
  const outputs = [];
  for (const width of [640, 960]) {
    const filename = `${study.name}-${width}.webp`;
    const target = `apps/web/public/media/${filename}`;
    await sharp(render)
      .trim()
      .resize(width, width, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 84, effort: 6 })
      .toFile(target);
    outputs.push({ filename, width, height: width, bytes: (await stat(target)).size });
  }
  manifest.push({
    ...study,
    sha256: hash.digest('hex'),
    renderEngine: 'Blender 5.2.2 / Cycles, 24 samples, AgX, orthographic studio, transparent film',
    packedTextures: '3 x 2048px; source inspection found no missing external images',
    usage: 'Offline-rendered model study, not gameplay or a web-ready mesh',
    rights:
      'User-identified Caelora source master; Meshy provider/plan redistribution rights not independently verified',
    outputs,
  });
}
await writeFile(
  'packages/shared-assets/m3-5-model-studies.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(manifest.map((item) => ({ name: item.name, outputs: item.outputs })));
