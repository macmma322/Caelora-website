import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('apps/web/dist');
async function files(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : path.join(directory, entry.name),
      ),
    )
  ).flat();
}
const htmlFiles = (await files(root)).filter((file) => file.endsWith('.html'));
let checked = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  if (/<script\b(?![^>]*\bsrc=)[^>]*>/.test(html) || /<style\b/.test(html)) {
    throw new Error(`Inline script/style conflicts with static CSP: ${file}`);
  }
  if (
    !html.includes('lang="en"') ||
    !html.includes('name="description"') ||
    !html.includes('id="main"')
  )
    throw new Error(`Missing page semantics: ${file}`);
  for (const match of html.matchAll(/<(?:img)\b[^>]*>/g)) {
    if (!/\balt=/.test(match[0]) || !/\bwidth=/.test(match[0]) || !/\bheight=/.test(match[0]))
      throw new Error(`Missing image attributes: ${file}`);
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"<>]+)"/g)) {
    const target = match[1];
    if (!target || /^(?:https?:|mailto:|data:|javascript:)/.test(target)) continue;
    const [pathname, anchor] = target.split('#');
    const resolved = pathname ? path.join(root, pathname) : file;
    let targetFile = resolved;
    if (pathname?.endsWith('/')) targetFile = path.join(resolved, 'index.html');
    await access(targetFile);
    if (anchor && targetFile.endsWith('.html')) {
      const targetHtml = await readFile(targetFile, 'utf8');
      if (!targetHtml.includes(`id="${anchor}"`))
        throw new Error(`Broken fragment ${target} in ${file}`);
    }
    checked++;
  }
}
console.log(
  `PASS: ${htmlFiles.length} pages, ${checked} local asset/link references and fragments. Browser accessibility and layout require separate validation.`,
);
