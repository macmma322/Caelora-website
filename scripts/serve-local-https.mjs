import { createServer } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { parseRuntimeConfig } from '../packages/api-client/src/config.mjs';

// Developer-only, loopback static host. Production requires a separately reviewed ingress.
const root = resolve(import.meta.dirname, '..');
const argumentsMap = new Map();
for (let i = 2; i < process.argv.length; i += 2)
  argumentsMap.set(process.argv[i], process.argv[i + 1]);
const app = argumentsMap.get('--app') ?? 'account';
const port = Number(argumentsMap.get('--port') ?? (app === 'account' ? 4443 : 4444));
if (!['account', 'web'].includes(app) || !Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Use --app account|web and a valid unprivileged local port.');
const config = parseRuntimeConfig({
  environment: 'development',
  apiBaseUrl: process.env.CAELORA_HTTPS_API_ORIGIN ?? 'https://localhost:7443',
  websiteUrl: process.env.CAELORA_HTTPS_WEBSITE_ORIGIN ?? 'https://localhost:4444',
});
if (
  ![config.apiBaseUrl, config.websiteUrl].every((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'localhost';
  })
)
  throw new Error('HTTPS developer host requires localhost HTTPS public configuration.');
const directory = resolve(root, app === 'account' ? 'dist/account/browser' : 'apps/web/dist');
const certificateDirectory = resolve(root, 'artifacts/local-platform/https');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};
const server = createServer(
  {
    cert: await readFile(resolve(certificateDirectory, 'localhost.pem')),
    key: await readFile(resolve(certificateDirectory, 'localhost.key')),
  },
  async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${config.apiBaseUrl}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    );
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const path = decodeURIComponent(new URL(request.url ?? '/', 'https://localhost').pathname);
      if (app === 'account' && path === '/runtime-config.json') {
        response.setHeader('Content-Type', 'application/json');
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify(config));
        return;
      }
      let file = resolve(directory, '.' + path);
      if (!file.startsWith(directory + sep) && file !== directory) {
        response.writeHead(400);
        response.end();
        return;
      }
      try {
        if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
        await stat(file);
      } catch {
        if (app === 'account' && !extname(path)) file = resolve(directory, 'index.html');
        else {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
      }
      const bytes = await readFile(file);
      response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(400);
      response.end('Request could not be served.');
    }
  },
);
server.requestTimeout = 15000;
server.listen(port, '127.0.0.1', () =>
  process.stdout.write(`Local ${app} HTTPS: https://localhost:${port}\n`),
);
