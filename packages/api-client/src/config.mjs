/** Public configuration only. Reject secrets and unexpected keys instead of passing them through. */
/** @typedef {'development' | 'test' | 'staging' | 'production'} DeploymentEnvironment */
/** @typedef {{environment: DeploymentEnvironment, apiBaseUrl: string, websiteUrl: string}} RuntimeConfig */

/** @param {unknown} value @returns {RuntimeConfig} */
export function parseRuntimeConfig(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Runtime configuration must be an object.');
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  const keys = ['environment', 'apiBaseUrl', 'websiteUrl'];
  if (Object.keys(record).some((key) => !keys.includes(key))) {
    throw new Error('Runtime configuration contains unsupported fields.');
  }
  if (!['development', 'test', 'staging', 'production'].includes(String(record.environment))) {
    throw new Error('Runtime configuration requires a recognized environment.');
  }
  const environment = /** @type {DeploymentEnvironment} */ (record.environment);
  return Object.freeze({
    environment,
    apiBaseUrl: publicOrigin(record.apiBaseUrl, 'apiBaseUrl', environment),
    websiteUrl: publicOrigin(record.websiteUrl, 'websiteUrl', environment),
  });
}

/** @param {unknown} value @param {string} name @param {DeploymentEnvironment} environment */
function publicOrigin(value, name, environment) {
  if (typeof value !== 'string') throw new Error(`Missing public configuration: ${name}.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid public configuration: ${name}.`);
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const development = ['development', 'test'].includes(environment);
  if (
    (url.protocol !== 'https:' && !(development && local && url.protocol === 'http:')) ||
    (!development && local) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    url.hostname.includes('*')
  ) {
    throw new Error(`Unsafe public origin: ${name}.`);
  }
  return url.origin;
}

/** @param {typeof fetch} fetcher @returns {Promise<RuntimeConfig>} */
export async function loadRuntimeConfig(fetcher) {
  const response = await fetcher('/runtime-config.json', {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Runtime configuration is unavailable.');
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Runtime configuration must be served as JSON.');
  }
  return parseRuntimeConfig(await response.json());
}
