// Headless check of the cloak spring chain on the real exported skeleton: idle, a fast turn and a
// rest after it. Fails if any bone strays past its bend limit or does not settle back near rest.
// Run: node scripts/check-cloak-physics.mjs
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createCloakPhysics } from '../apps/web/src/scripts/cloak-physics.ts';

const gltf = JSON.parse(readFileSync('apps/web/public/models/crimson-regent/cloak.gltf', 'utf8'));
const objects = gltf.nodes.map((node) => {
  const object = node.mesh === undefined && node.name ? new THREE.Bone() : new THREE.Object3D();
  object.name = node.name ?? '';
  if (node.translation) object.position.fromArray(node.translation);
  if (node.rotation) object.quaternion.fromArray(node.rotation);
  if (node.scale) object.scale.fromArray(node.scale);
  return object;
});
gltf.nodes.forEach((node, i) => node.children?.forEach((c) => objects[i].add(objects[c])));
const group = new THREE.Group();
const root = new THREE.Group();
root.scale.setScalar(0.98);
for (const i of gltf.scenes[0].nodes) root.add(objects[i]);
group.add(root);

const cloth = createCloakPhysics(THREE, root);
const joints = [];
root.traverse((n) => n.isBone && /^Cloak_[LCR]_0\d$/.test(n.name) && joints.push(n));
const restLocal = new Map(joints.map((b) => [b, b.quaternion.clone()]));
const worst = () =>
  Math.max(...joints.map((b) => (b.quaternion.angleTo(restLocal.get(b)) * 180) / Math.PI));

const report = [];
const run = (seconds, yawSpeed) => {
  let peak = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    group.rotation.y += yawSpeed / 60;
    cloth.update(1 / 60);
    peak = Math.max(peak, worst());
  }
  return { peak: Math.round(peak), end: Math.round(worst()) };
};
report.push(['idle 3s', run(3, 0)]);
report.push(['fast turn 1s (3 rad/s)', run(1, 3)]);
report.push(['rest 4s', run(4, 0)]);
console.table(Object.fromEntries(report));
const [, turn] = report[1];
const [, after] = report[2];
if (turn.peak > 56 || after.end > 20) {
  console.error('FAIL: cloak exceeded its bend limit or did not settle');
  process.exit(1);
}
console.log('ok');
