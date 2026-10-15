import { request } from 'node:https';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { URI } from 'otpauth';

// Synthetic local accounts only. No cookies, passwords, action links or MFA secrets are printed.
const api = 'https://localhost:7443';
const origin = 'https://localhost:4443';
const ca = await readFile(
  new URL('../artifacts/local-platform/https/localhost.pem', import.meta.url),
);
function expect(condition, label) {
  if (!condition) throw new Error(`Local HTTPS check failed: ${label}`);
}
function client() {
  const jar = new Map();
  async function send(path, method = 'GET', body, extra = {}, target = api) {
    const headers = { Origin: origin, ...extra };
    if (jar.size) headers.Cookie = [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return new Promise((resolve, reject) => {
      const req = request(
        new URL(path, target),
        { method, headers, ca, timeout: 15000 },
        (response) => {
          const cookies = response.headers['set-cookie'] ?? [];
          for (const cookie of cookies) {
            const [pair] = cookie.split(';');
            const split = pair.indexOf('=');
            jar.set(pair.slice(0, split), pair.slice(split + 1));
          }
          let text = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            text += chunk;
          });
          response.on('end', () => {
            let json;
            try {
              json = JSON.parse(text);
            } catch {
              /* HTML/empty responses are expected in some probes. */
            }
            resolve({
              status: response.statusCode,
              headers: response.headers,
              cookies,
              json,
              text,
            });
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Local HTTPS timeout')));
      req.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
  async function mutate(path, body, extra = {}) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const csrf = await send('/api/v1/auth/csrf');
      const response = await send(path, 'POST', body, {
        'X-Caelora-CSRF': csrf.json?.token,
        ...extra,
      });
      if (response.status !== 429) return response;
      await delay(11000); // Exercise the real limiter; never relax it for this probe.
    }
    throw new Error('Local HTTPS rate limit did not recover');
  }
  return { send, mutate };
}
async function mailLink(email, subject) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const listing = await (await fetch('http://localhost:8025/api/v1/messages')).json();
    const message = listing.messages.find(
      (item) =>
        item.Subject === subject && item.To.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const detail = await (
        await fetch(`http://localhost:8025/api/v1/message/${message.ID}`)
      ).json();
      expect(detail.HTML.includes('CAELORA') && detail.Text.length > 0, 'multipart branded mail');
      const link = detail.Text.match(/https:\/\/localhost:4443\/[^\s]+/)?.[0];
      expect(!!link, 'HTTPS email action origin');
      return new URL(link);
    }
    await delay(1000);
  }
  throw new Error('Local Mailpit delivery deadline exceeded');
}
function actionData(link) {
  return Object.fromEntries(new URLSearchParams(link.hash.slice(1)));
}
const first = client();
const email = `m3-https-${randomUUID()}@caelora.test`;
let password = randomBytes(24).toString('base64url');
expect(
  (
    await first.mutate('/api/v1/auth/register', {
      email,
      password,
      displayName: 'HTTPS Test Warden',
    })
  ).status === 202,
  'queued registration',
);
const verification = await mailLink(email, 'Verify your Caelora email');
expect(
  (await first.send(verification.pathname, 'GET', undefined, {}, origin)).status === 200,
  'verification frontend route',
);
expect(
  (await first.mutate('/api/v1/auth/confirm-email', actionData(verification))).status === 200,
  'email confirmation',
);
let login = await first.mutate('/api/v1/auth/login', { email, password });
expect(login.status === 200, 'verified password login');
const cookie = login.cookies.find((value) => value.startsWith('__Host-Caelora.Session='));
expect(
  cookie &&
    /; secure/i.test(cookie) &&
    /; httponly/i.test(cookie) &&
    /; samesite=lax/i.test(cookie) &&
    /; path=\//i.test(cookie) &&
    !/; domain=/i.test(cookie),
  'host-only Secure HttpOnly SameSite cookie',
);
expect(
  login.headers['access-control-allow-origin'] === origin &&
    login.headers['access-control-allow-credentials'] === 'true',
  'credentialed exact-origin CORS',
);
expect(
  (await first.send('/api/v1/me/profile', 'PUT', { displayName: 'CSRF must fail' })).status === 403,
  'missing CSRF rejected',
);
expect(
  (
    await first.mutate(
      '/api/v1/me/notifications/read',
      { all: true },
      { Origin: 'https://untrusted.example' },
    )
  ).status === 403,
  'wrong Origin rejected',
);
const cross = await first.send('/api/v1/me', 'GET', undefined, {
  Origin: 'https://untrusted.example',
});
expect(!cross.headers['access-control-allow-origin'], 'cross-origin reading not granted');
expect(
  login.headers['x-content-type-options'] === 'nosniff' &&
    login.headers['referrer-policy'] === 'no-referrer' &&
    login.headers['x-frame-options'] === 'DENY',
  'API security headers',
);
console.log(
  'PASS: trusted TLS, queued multipart verification mail, verification route, host-only Secure cookie, CSRF, Origin and credentialed CORS.',
);
await first.mutate('/api/v1/auth/forgot-password', { email });
const reset = await mailLink(email, 'Reset your Caelora password');
expect(
  (await first.send(reset.pathname, 'GET', undefined, {}, origin)).status === 200,
  'reset frontend route',
);
password = randomBytes(24).toString('base64url');
expect(
  (await first.mutate('/api/v1/auth/reset-password', { ...actionData(reset), password })).status ===
    200,
  'password reset',
);
expect((await first.send('/api/v1/me')).status === 401, 'reset revoked old session');
expect(
  (await first.mutate('/api/v1/auth/login', { email, password })).status === 200,
  'replacement password login',
);
const setup = await first.mutate('/api/v1/me/mfa/enrollment', {});
expect(setup.status === 200, 'MFA enrollment');
const totp = URI.parse(setup.json.provisioningUri);
const activation = await first.mutate('/api/v1/me/mfa/activate', { code: totp.generate() });
expect(
  activation.status === 200 && activation.json.recoveryCodes.length === 10,
  'real TOTP activation',
);
expect((await first.send('/api/v1/me')).status === 401, 'activation revoked current session');
const second = client();
for (const [index, current] of [first, second].entries()) {
  login = await current.mutate('/api/v1/auth/login', { email, password });
  expect(login.status === 202 && login.json.mfaRequired, 'password alone cannot bypass MFA');
  expect((await current.send('/api/v1/me')).status === 401, 'pending MFA has no private access');
  expect(
    (
      await current.mutate('/api/v1/auth/mfa', {
        challenge: login.json.challenge,
        code: activation.json.recoveryCodes[index],
        useRecoveryCode: true,
      })
    ).status === 200,
    'single-use recovery sign-in',
  );
}
const sessions = await first.send('/api/v1/me/security');
expect(sessions.json.sessions.length === 2, 'independent session cookies');
expect(
  (await first.mutate('/api/v1/me/sessions/revoke', { scope: 'others' })).json.revoked === 1,
  'remote revocation',
);
expect((await second.send('/api/v1/me')).status === 401, 'terminated cookie rejected');
expect((await first.send('/api/v1/me')).status === 200, 'current session preserved');
const notifications = await first.send('/api/v1/me/notifications');
expect(
  notifications.json.items.some((item) => item.title === 'Authenticator enabled') &&
    notifications.json.unread > 0,
  'persisted security notifications',
);
expect(
  (await first.mutate('/api/v1/me/notifications/read', { all: true })).json.unread === 0,
  'mark all read',
);
expect((await first.mutate('/api/v1/auth/logout', {})).status === 204, 'HTTPS logout');
expect((await first.send('/api/v1/me')).status === 401, 'logout enforcement');
console.log(
  'PASS: HTTPS reset route and revocation, real TOTP activation, MFA challenge, two recovery sign-ins, remote revocation, persisted notifications and logout.',
);
