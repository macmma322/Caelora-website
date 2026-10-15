import { execFileSync } from 'node:child_process';
import { readFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const paths = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean),
  ),
];
let links = 0;
for (const file of paths.filter((file) => file.endsWith('.md'))) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), target);
    if (!resolved.startsWith(`${root}${path.sep}`))
      throw new Error(`Documentation link escapes workspace: ${file}`);
    await access(resolved);
    links++;
  }
}
const ignored = new Set([
  'node_modules',
  '.git',
  'dist',
  'bin',
  'obj',
  'artifacts',
  '.angular',
  '.astro',
]);
async function verifyNestedGit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' && directory !== root)
      throw new Error(`Nested repository: ${directory}`);
    if (entry.isDirectory() && !ignored.has(entry.name))
      await verifyNestedGit(path.join(directory, entry.name));
  }
}
await verifyNestedGit(root);
console.log(`PASS: ${links} local documentation links; no nested repositories in source.`);
