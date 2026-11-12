import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Workstation-only: renders the showcase poster from the live Three.js viewer so the still and the
// interactive study match exactly. Requires a running site (CAELORA_DESIGN_URL) and a Playwright
// module (CAELORA_PLAYWRIGHT_MODULE), as in scripts/verify-design.mjs.
const playwright = await import(process.env.CAELORA_PLAYWRIGHT_MODULE ?? 'playwright');
const chromium = playwright.chromium ?? playwright.default.chromium;
const origin = process.env.CAELORA_DESIGN_URL ?? 'http://localhost:4321';
const output = fileURLToPath(new URL('../apps/web/public/media/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  bypassCSP: true,
});
await page.goto(new URL('/hearth/', origin).href, { waitUntil: 'networkidle' });
const stage = page.locator('[data-model-stage]').first();
await stage.scrollIntoViewIfNeeded();
await page.locator('[data-model-start]').first().click();
await page.waitForSelector('[data-model-stage].is-live', { timeout: 30000 });
await page.addStyleTag({
  content: `html, body, main, .model-showcase, .model-stage, .model-viewport { background: transparent !important; }
    .embers, .model-showcase::before, .model-showcase::after { display: none !important; }
    .model-stage, .model-viewport { border-color: transparent !important; box-shadow: none !important; }
    .model-controls, .model-message, .model-stage figcaption, .model-poster { visibility: hidden !important; }`,
});
// Let the cloth settle into its rest drape before the still is taken.
await page.waitForTimeout(2500);
const png = await stage.locator('.model-viewport').screenshot({ omitBackground: true });
await browser.close();
for (const size of [640, 960]) {
  await sharp(png)
    .resize({ width: size, height: size })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(`${output}cloak-poster-${size}.webp`);
}
console.log('Rendered cloak-poster-640.webp and cloak-poster-960.webp');
