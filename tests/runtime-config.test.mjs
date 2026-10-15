import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRuntimeConfig, loadRuntimeConfig } from '../packages/api-client/src/config.mjs';

const local = {
  environment: 'development',
  apiBaseUrl: 'http://localhost:5080',
  websiteUrl: 'http://localhost:4321',
};
test('development supports explicit loopback origins and immutable configuration', () => {
  const config = parseRuntimeConfig(local);
  assert.equal(config.apiBaseUrl, local.apiBaseUrl);
  assert.ok(Object.isFrozen(config));
});
for (const value of [
  null,
  [],
  {},
  { ...local, environment: 'unknown' },
  { ...local, secret: 'must-not-pass' },
  { ...local, apiBaseUrl: 'javascript:alert(1)' },
  { ...local, websiteUrl: 'https://name:password@example.com' },
  { ...local, apiBaseUrl: 'https://api.example.com/path' },
  { ...local, environment: 'production' },
  { ...local, environment: 'staging' },
]) {
  test(`reject invalid configuration case ${JSON.stringify(Object.keys(value ?? {}))} ${JSON.stringify(value?.environment)}`, () =>
    assert.throws(() => parseRuntimeConfig(value)));
}
test('production requires public HTTPS origins', () =>
  assert.equal(
    parseRuntimeConfig({
      environment: 'production',
      apiBaseUrl: 'https://api.example.com',
      websiteUrl: 'https://www.example.com',
    }).apiBaseUrl,
    'https://api.example.com',
  ));
test('load uses no-store and validates the JSON response', async () => {
  const config = await loadRuntimeConfig(async (path, options) => {
    assert.equal(path, '/runtime-config.json');
    assert.equal(options.cache, 'no-store');
    return Response.json(local);
  });
  assert.equal(config.environment, 'development');
});
test('missing file and SPA fallback HTML fail closed', async () => {
  await assert.rejects(loadRuntimeConfig(async () => new Response('', { status: 404 })));
  await assert.rejects(
    loadRuntimeConfig(
      async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    ),
  );
});
