import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';

@Component({
  selector: 'caelora-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `<a class="skip-link" href="#main">Skip to content</a>
    <header class="portal-header">
      <a class="portal-brand" [href]="config.websiteUrl">CAELORA</a
      ><span class="eyebrow">Administration</span>
    </header>
    <div class="portal-layout">
      <nav class="portal-nav" aria-label="Administrative navigation">
        <a routerLink="/">Access information</a><a [href]="config.websiteUrl">Public website ↗</a>
      </nav>
      <main id="main"><router-outlet /></main>
    </div>
    <footer class="portal-footer">Administrative services have not been enabled.</footer>`,
})
export class AdminShell {
  readonly config = inject(RUNTIME_CONFIG);
}
