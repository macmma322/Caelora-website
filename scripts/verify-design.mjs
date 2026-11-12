import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Optional browser QA, separate from the portable build. Supply an installed Playwright module
// (CAELORA_PLAYWRIGHT_MODULE) and a running site (CAELORA_DESIGN_URL, default the Astro dev port).
const playwright = await import(process.env.CAELORA_PLAYWRIGHT_MODULE ?? 'playwright');
const chromium = playwright.chromium ?? playwright.default.chromium;
const origin = process.env.CAELORA_DESIGN_URL ?? 'http://localhost:4321';
const output = process.env.CAELORA_DESIGN_ARTIFACTS ?? 'artifacts/design-evolution/verify';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];

async function walk(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    await Promise.all(
      [...document.images]
        .filter((image) => image.getAttribute('src') && image.getClientRects().length > 0)
        .map((image) => image.decode().catch(() => {})),
    );
    scrollTo({ top: 0, behavior: 'instant' });
  });
}
async function layout(page) {
  return page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    width: innerWidth,
    brokenImages: [...document.images]
      .filter(
        (image) =>
          image.getAttribute('src') && image.getClientRects().length > 0 && !image.naturalWidth,
      )
      .map((image) => image.getAttribute('src')),
    hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter(
      (element) => getComputedStyle(element).opacity !== '1',
    ).length,
  }));
}

try {
  // 1. Every page at every target viewport: no overflow, no broken images, no page errors.
  for (const path of [
    '/',
    '/wilds/',
    '/hearth/',
    '/village/',
    '/bestiary/',
    '/kingdoms/',
    '/community/',
    '/journal/',
    '/journal/foundation/',
    '/media/',
    '/project-information/',
  ])
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 640],
      [390, 1200],
    ]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin + path);
      await walk(page);
      const result = { path, width, height, ...(await layout(page)), errors };
      assert.equal(result.documentWidth, width, `Overflow on ${path} at ${width}`);
      assert.deepEqual(result.brokenImages, [], `Broken images on ${path} at ${width}`);
      assert.deepEqual(errors, [], `Page errors on ${path} at ${width}`);
      results.push(result);
      if (path === '/')
        await page.screenshot({ path: `${output}/home-${width}x${height}.png`, fullPage: true });
      await context.close();
    }

  // 2. Mobile menu: opens, Escape closes and returns focus, link closes it.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(origin);
  const menu = mobile.locator('.mobile-nav');
  await menu.locator('summary').click();
  assert.equal(await menu.evaluate((element) => element.open), true);
  await mobile.keyboard.press('Escape');
  assert.equal(await menu.evaluate((element) => element.open), false);
  assert.equal(
    await menu.locator('summary').evaluate((element) => document.activeElement === element),
    true,
  );
  await menu.locator('summary').click();
  await menu.getByRole('link', { name: 'The valley', exact: true }).click();
  assert.equal(await menu.evaluate((element) => element.open), false);

  // 3. Viewer: opens on an archive link, arrows move, Escape returns focus to the trigger.
  await mobile.goto(`${origin}/media/`);
  const first = mobile.locator('a[data-artwork]').first();
  await first.click();
  await mobile.locator('.art-viewer[open]').waitFor();
  await mobile.locator('#viewer-image:not([hidden])').waitFor();
  await mobile.keyboard.press('ArrowRight');
  await mobile.locator('.viewer-position', { hasText: '2 /' }).waitFor();
  await mobile.keyboard.press('Escape');
  assert.equal(await first.evaluate((element) => document.activeElement === element), true);

  // 4. 3D study is poster-first: no WebGL module before the visitor asks for it.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const scripts = [];
  desktop.on(
    'request',
    (request) => request.resourceType() === 'script' && scripts.push(request.url()),
  );
  await desktop.goto(origin);
  assert.equal(await desktop.locator('.valley .pin-link').count(), 5, 'Five places on the map');
  await desktop.goto(`${origin}/hearth/`);
  await walk(desktop);
  const threeBefore = scripts.filter((url) => /three|GLTFLoader/i.test(url)).length;
  await desktop.locator('[data-model-start]').click();
  await desktop.locator('[data-model-stage].is-live').waitFor({ timeout: 30000 });
  assert.equal(threeBefore, 0, 'WebGL code loaded before the visitor asked for it');
  results.push({ threeChunksBeforeRequest: threeBefore });

  // 5. Reduced motion and no-script: every revealed element is fully visible.
  const reduced = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(origin);
  assert.equal((await layout(reducedPage)).hiddenReveals, 0, 'Reduced motion hides content');
  const noScript = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await noScript.newPage();
  await staticPage.goto(origin);
  assert.equal((await layout(staticPage)).hiddenReveals, 0, 'No-script hides content');
  assert.equal(await staticPage.locator('.model-start').isVisible(), false);
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} checks. Screenshots in ${output}.`);
} finally {
  await browser.close();
}
