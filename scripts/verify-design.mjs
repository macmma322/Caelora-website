import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Optional browser QA, separate from the portable build. Supply an installed Playwright module.
const playwright = await import(process.env.CAELORA_PLAYWRIGHT_MODULE ?? 'playwright');
const chromium = playwright.chromium ?? playwright.default.chromium;
const origin = process.env.CAELORA_DESIGN_URL ?? 'http://localhost:4321';
const output = process.env.CAELORA_DESIGN_ARTIFACTS ?? 'artifacts/m3-5/after';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const layouts = [];
async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}
async function loadArtwork() {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    await Promise.all(
      [...document.images]
        .filter((image) => image.hasAttribute('src') && image.getClientRects().length > 0)
        .map((image) => image.decode().catch(() => {})),
    );
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(150);
}
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(origin);
    await settle();
    await loadArtwork();
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      height: innerHeight,
      enhanced: document.querySelector('.journey')?.classList.contains('is-enhanced'),
      brokenImages: [...document.images]
        .filter(
          (image) =>
            image.hasAttribute('src') && image.getClientRects().length > 0 && !image.naturalWidth,
        )
        .map((image) => image.getAttribute('src')),
    }));
    assert.equal(layout.documentWidth, width, `Overflow at ${width}`);
    assert.deepEqual(layout.brokenImages, []);
    layouts.push(layout);
    await page.screenshot({ path: `${output}/hero-${width}.png` });
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
  }
  const menu = page.locator('.mobile-nav');
  await menu.locator('summary').click();
  assert.equal(await menu.evaluate((element) => element.open), true);
  await page.screenshot({ path: `${output}/mobile-menu.png` });
  await page.keyboard.press('Escape');
  assert.equal(await menu.evaluate((element) => element.open), false);
  assert.equal(
    await page.locator('summary').evaluate((element) => document.activeElement === element),
    true,
  );
  await menu.locator('summary').click();
  await menu.getByRole('link', { name: 'The world', exact: true }).click();
  assert.equal(await menu.evaluate((element) => element.open), false);
  await page.locator('[data-artwork="1"]').click();
  await page.locator('.art-viewer[open]').waitFor();
  await page.locator('#viewer-image[src$="dragon-960.webp"]').waitFor({ state: 'visible' });
  await page.screenshot({ path: `${output}/gallery-mobile.png` });
  await page.keyboard.press('ArrowRight');
  await page.locator('#viewer-image[src$="atlas-960.webp"]').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  assert.equal(
    await page
      .locator('[data-artwork="1"]')
      .evaluate((element) => document.activeElement === element),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin);
  await settle();
  const bounds = await page.locator('.journey').evaluate((element) => ({
    top: element.getBoundingClientRect().top + scrollY,
    travel: element.getBoundingClientRect().height - innerHeight,
  }));
  const phases = [];
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate(
      ({ top, travel, progress }) =>
        scrollTo({ top: top + travel * progress, behavior: 'instant' }),
      { ...bounds, progress },
    );
    await page.waitForTimeout(120);
    phases.push(
      await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('[data-journey-layer]')].map((element) => [
            element.getAttribute('data-journey-layer'),
            {
              transform: getComputedStyle(element).transform,
              opacity: getComputedStyle(element).opacity,
            },
          ]),
        ),
      ),
    );
    await page.screenshot({ path: `${output}/journey-${progress}.png` });
  }
  assert.notEqual(phases[0].distant.transform, phases[4].distant.transform);
  assert.notEqual(phases[4].middle.transform, phases[4].near.transform);
  assert.equal(
    await page.locator('.home-copy').evaluate((element) => getComputedStyle(element).opacity),
    '1',
  );
  await page.locator('.desktop-nav a[href="/#your-path"]').click();
  await page.waitForTimeout(900);
  assert.ok(
    await page
      .locator('.home-copy')
      .evaluate((element) => Number(getComputedStyle(element).opacity) > 0.9),
  );
  for (const selector of [
    '.introduction',
    '.life-ledger',
    '.bonds-section',
    '.dragon-scene',
    '.living-world',
    '.freedom',
    '.journal-section',
    '.media-section',
    '.closing',
  ]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${output}/${selector.slice(1)}-desktop.png` });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin);
  await loadArtwork();
  assert.equal(
    await page.locator('.journey').evaluate((element) => element.classList.contains('is-enhanced')),
    false,
  );
  for (const selector of ['.wilderness-copy', '.home-copy'])
    assert.equal(
      await page.locator(selector).evaluate((element) => getComputedStyle(element).opacity),
      '1',
    );
  await page.screenshot({ path: `${output}/reduced-motion-desktop.png`, fullPage: true });
  for (const width of [720, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      `Reflow at ${width}`,
    );
  }
  const noScript = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const staticPage = await noScript.newPage();
  await staticPage.goto(origin);
  for (const selector of ['.wilderness-copy', '.home-copy'])
    assert.equal(
      await staticPage.locator(selector).evaluate((element) => getComputedStyle(element).opacity),
      '1',
    );
  assert.ok(
    (await staticPage.locator('[data-artwork="1"]').getAttribute('href')).endsWith('.webp'),
  );
  await staticPage.screenshot({ path: `${output}/no-script-desktop.png`, fullPage: true });
  await noScript.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify(
      {
        layouts,
        phases,
        pageErrors: errors,
        checks: [
          'six viewport overflow/image checks',
          'gallery arrows/Escape/focus return',
          'native mobile menu selection/Escape',
          'five scene phases',
          'depth planes move independently',
          'settlement arrival and direct navigation',
          'reduced motion',
          '720/320px reflow',
          'no-script chapters and direct image links',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: six viewports, five scene phases, gallery, menu, reduced motion, reflow and no-script. Evidence: ${output}`,
  );
} finally {
  await browser.close();
}
