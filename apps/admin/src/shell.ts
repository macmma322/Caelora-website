import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';

@Component({
  selector: 'caelora-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<a class="skip-link" href="#main">Skip to content</a>
    <header class="portal-header studio-header">
      <div class="studio-brand">
        <a class="portal-brand" [href]="config.websiteUrl"
          ><img src="/brand/caelora-wordmark.webp" width="480" height="146" alt="Caelora"
        /></a>
        <span class="studio-label">Studio</span>
      </div>
      <nav class="studio-nav" aria-label="Studio">
        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          >Access information</a
        >
        <a [href]="config.websiteUrl">Public website <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
    <div class="portal-layout studio-layout">
      <main id="main"><router-outlet /></main>
    </div>
    <footer class="portal-footer">
      <span>Caelora Studio</span><span>Administrative services have not been enabled.</span>
    </footer>`,
})
export class AdminShell {
  readonly config = inject(RUNTIME_CONFIG);
}
