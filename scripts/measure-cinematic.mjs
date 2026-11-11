import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(
  'C:/Users/nikol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/x.js',
);
const { chromium } = require('playwright');
const phase = process.argv[2] ?? 'before';
const out = `artifacts/cinematic/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
for (const [name, width, height, mobile] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
]) {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__vitals = { lcp: 0, cls: 0, longTasks: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        window.__vitals.longTasks += list.getEntries().length;
      }).observe({ type: 'longtask', buffered: true });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40,
      downloadThroughput: mobile ? 200000 : 1250000,
      uploadThroughput: 1000000,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
    // HMR keeps a dev-server socket open, so networkidle is not a stable lab boundary.
    await page.goto(process.env.CAELORA_DESIGN_URL ?? 'http://127.0.0.1:4321', {
      waitUntil: 'commit',
      timeout: 60000,
    });
    await page.waitForFunction(() => document.readyState !== 'loading', undefined, {
      timeout: 60000,
    });
    await page.waitForTimeout(1500);
    const result = await page.evaluate(() => ({
      ...window.__vitals,
      bytes: performance.getEntriesByType('resource').reduce((n, e) => n + e.transferSize, 0),
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    results.push({ name, run, ...result });
    if (run === 0) {
      await page.screenshot({ path: `${out}/${name}-hero.png` });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });
    }
    await context.close();
  }
}
await browser.close();
await writeFile(
  `${out}/performance.json`,
  JSON.stringify(
    {
      note: 'Lab proxies, 3 cold-cache runs. Desktop 10Mbps/40ms/1x CPU; mobile 1.6Mbps/40ms/4x CPU. Local server, not field CWV. INP not measured.',
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
