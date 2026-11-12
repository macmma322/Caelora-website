import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { parseRuntimeConfig } from '../packages/api-client/src/config.mjs';

const app = process.argv[process.argv.indexOf('--app') + 1] ?? process.env.CAELORA_APP ?? 'web';
const port = Number(process.env.PORT ?? '4321');
const root = resolve(import.meta.dirname, '..');
const directories = {
  web: resolve(root, 'apps/web/dist'),
  account: resolve(root, 'dist/account/browser'),
  admin: resolve(root, 'dist/admin/browser'),
};

if (!(app in directories) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Use --app web|account|admin and a valid PORT.');
}

const directory = directories[app];
const config =
  app === 'web'
    ? null
    : parseRuntimeConfig({
        environment: process.env.CAELORA_DEPLOYMENT_ENV,
        apiBaseUrl: process.env.CAELORA_API_ORIGIN,
        websiteUrl: process.env.CAELORA_WEBSITE_ORIGIN,
      });

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function setHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${config?.apiBaseUrl ?? "'none'"}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
  );
}

const server = createServer(async (request, response) => {
  setHeaders(response);
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://railway').pathname);
    if (config && pathname === '/runtime-config.json') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(request.method === 'HEAD' ? undefined : `${JSON.stringify(config)}\n`);
      return;
    }
    let file = resolve(directory, `.${pathname}`);
    if (!file.startsWith(directory + sep) && file !== directory) {
      response.writeHead(400);
      response.end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      await stat(file);
    } catch {
      if (app === 'account' || app === 'admin') file = resolve(directory, 'index.html');
      else {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
    }
    const bytes = await readFile(file);
    const extension = extname(file);
    response.writeHead(200, {
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Type': types[extension] ?? 'application/octet-stream',
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(400);
    response.end('Request could not be served.');
  }
});

server.requestTimeout = 15000;
server.listen(port, '0.0.0.0', () =>
  process.stdout.write(`Caelora ${app} production server listening on ${port}\n`),
);
