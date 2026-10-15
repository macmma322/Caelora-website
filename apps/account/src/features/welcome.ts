import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getPlatformInfo } from '@caelora/api-client';
import { RUNTIME_CONFIG } from '../../../../packages/api-client/src/portal-bootstrap';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<span class="eyebrow">Your place in Caelora</span>
    <h1>Every journey begins<br />with a place to return.</h1>
    <p class="lead">The account portal is taking shape.</p>
    <p>
      Registration and sign-in are not available yet. Future account services are intended to bring
      your identity, game ownership and security controls together.
    </p>
    <div class="notice">
      <h2>What is available today?</h2>
      <p>
        This public introduction. No account data, Steam linking, launcher downloads or purchases
        are accessible.
      </p>
    </div>
    <a class="button" routerLink="/sign-in"
      >About future sign-in <span aria-hidden="true">↗</span></a
    >
    <section class="service-check" aria-labelledby="service-title">
      <h2 id="service-title">Platform connection</h2>
      <p aria-live="polite">{{ status() }}</p>
      <button class="button secondary" type="button" (click)="check()" [disabled]="loading()">
        {{ loading() ? 'Checking…' : 'Check connection' }}
      </button>
    </section>`,
})
export class WelcomePage {
  private readonly config = inject(RUNTIME_CONFIG);
  readonly status = signal('No connection check has been requested.');
  readonly loading = signal(false);
  async check(): Promise<void> {
    this.loading.set(true);
    this.status.set('Contacting the platform…');
    try {
      const information = await getPlatformInfo(this.config.apiBaseUrl);
      this.status.set(
        `Platform responded: ${information.stage}. Account services remain unavailable.`,
      );
    } catch {
      this.status.set('The platform could not be reached. You can try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
