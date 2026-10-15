import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';

@Component({
  selector: 'caelora-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<a class="skip-link" href="#main">Skip to content</a>
    <header class="portal-header">
      <a class="portal-brand" [href]="config.websiteUrl">CAELORA</a
      ><span class="eyebrow">Account portal</span>
    </header>
    <div class="portal-layout">
      <nav class="portal-nav" aria-label="Account navigation">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
          >Welcome</a
        ><a routerLink="/sign-in" routerLinkActive="active">Sign-in information</a
        ><a [href]="config.websiteUrl">Return to the world ↗</a>
      </nav>
      <main id="main"><router-outlet /></main>
    </div>
    <footer class="portal-footer">
      Caelora · In development · No account or purchase services are available.
    </footer>`,
})
export class AccountShell {
  readonly config = inject(RUNTIME_CONFIG);
}
