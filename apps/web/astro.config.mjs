import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { parseRuntimeConfig } from '../../packages/api-client/src/config.mjs';

const env = {
  ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''),
  ...process.env,
};
const environment = env.PUBLIC_DEPLOYMENT_ENV ?? 'development';
if (!env.PUBLIC_DEPLOYMENT_ENV && process.env.CI === 'true') {
  throw new Error('CI builds must explicitly set PUBLIC_DEPLOYMENT_ENV.');
}
const config = parseRuntimeConfig({
  environment,
  websiteUrl: env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  // Only used to validate an optional portal origin; no API dependency for the static site.
  apiBaseUrl: env.PUBLIC_ACCOUNT_URL || env.PUBLIC_SITE_URL || 'http://localhost:4321',
});

export default defineConfig({
  site: config.websiteUrl,
  output: 'static',
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'never' },
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
  // Keep scripts/styles external so static hosts can enforce CSP without unsafe-inline.
  vite: {
    build: { assetsInlineLimit: 0 },
    // Three's browser module is intentionally served from source in dev. This avoids
    // stale optimize-deps artefacts after dependency changes while production remains bundled.
    optimizeDeps: { exclude: ['three'] },
    server: { fs: { allow: ['../..'] } },
  },
});
