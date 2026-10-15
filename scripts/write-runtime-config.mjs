import { writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseRuntimeConfig } from '../packages/api-client/src/config.mjs';

const config = parseRuntimeConfig({
  environment: process.env.CAELORA_DEPLOYMENT_ENV,
  apiBaseUrl: process.env.CAELORA_API_ORIGIN,
  websiteUrl: process.env.CAELORA_WEBSITE_ORIGIN,
});
if (!['production', 'staging'].includes(config.environment))
  throw new Error(
    'Artifact promotion requires staging or production. Use bootstrap for local development.',
  );
const targets = process.argv.slice(2);
if (targets.length === 0) throw new Error('Supply built portal directory paths.');
for (const target of targets) {
  const directory = path.resolve(target);
  await stat(path.join(directory, 'index.html'));
  await writeFile(
    path.join(directory, 'runtime-config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
  );
  await writeFile(
    path.join(directory, '_headers'),
    `/*
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${config.apiBaseUrl}; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'

/runtime-config.json
  Cache-Control: no-store
  Content-Type: application/json
`,
  );
  console.log(`Configured ${directory} for ${config.environment}; JavaScript bundles unchanged.`);
}
