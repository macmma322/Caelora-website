import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlatformInfo } from '../packages/api-client/src/index.ts';

const contract = {
  contractVersion: '1',
  stage: 'foundation',
  accountsAvailable: false,
  purchasesAvailable: false,
  launcherAvailable: false,
};
test('public API client uses the v1 endpoint without credentials and validates the contract', async () => {
  const info = await getPlatformInfo('https://api.example.com', async (url, options) => {
    assert.equal(url.toString(), 'https://api.example.com/api/v1/platform');
    assert.equal(options.credentials, 'omit');
    return Response.json(contract);
  });
  assert.deepEqual(info, contract);
});
test('client rejects an unsuccessful response or an unsupported contract', async () => {
  await assert.rejects(
    getPlatformInfo('https://api.example.com', async () => new Response('', { status: 503 })),
  );
  await assert.rejects(
    getPlatformInfo('https://api.example.com', async () =>
      Response.json({ ...contract, contractVersion: '2' }),
    ),
  );
  await assert.rejects(
    getPlatformInfo('https://api.example.com', async () =>
      Response.json({ ...contract, accountsAvailable: 'true' }),
    ),
  );
});
