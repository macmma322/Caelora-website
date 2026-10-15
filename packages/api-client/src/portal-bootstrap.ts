import { InjectionToken } from '@angular/core';
import { loadRuntimeConfig, type RuntimeConfig } from './config.mjs';

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>(
  'Caelora public runtime configuration',
);

export async function bootstrapPortal(
  start: (config: RuntimeConfig) => Promise<unknown>,
): Promise<void> {
  try {
    const config = await loadRuntimeConfig(fetch);
    await start(config);
  } catch {
    // Use textContent only. Configuration and exception details never become HTML.
    const root = document.querySelector('caelora-root');
    if (root) {
      const main = document.createElement('main');
      main.className = 'boot-message';
      main.setAttribute('role', 'alert');
      const heading = document.createElement('h1');
      heading.textContent = 'The portal could not open.';
      const message = document.createElement('p');
      message.textContent = 'Public configuration is missing or invalid. Please try again later.';
      const retry = document.createElement('button');
      retry.className = 'button';
      retry.textContent = 'Try again';
      retry.addEventListener('click', () => window.location.reload());
      main.append(heading, message, retry);
      root.replaceChildren(main);
    }
  }
}
