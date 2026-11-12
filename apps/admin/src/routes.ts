import { Component, inject } from '@angular/core';
import { RouterLink, type Routes } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';

@Component({
  standalone: true,
  template: `<header class="page-header">
      <span class="eyebrow">Caelora Studio</span>
      <h1>Studio access is restricted.</h1>
      <p class="page-meta"><span class="status-tag" data-status="unavailable">Restricted</span></p>
      <p class="lead">
        No administrative functions or data are deployed in this milestone. There is nothing here to
        sign in to yet.
      </p>
    </header>
    <section class="studio-section" aria-labelledby="requirements-title">
      <h2 id="requirements-title">What access will require</h2>
      <dl class="definition-rows">
        <div>
          <dt>Verified identity</dt>
          <dd>An account with a confirmed email address.</dd>
        </div>
        <div>
          <dt>Multi-factor authentication</dt>
          <dd>A second factor on the account that opens an administrative session.</dd>
        </div>
        <div>
          <dt>An explicit administrative policy</dt>
          <dd>A named policy that grants each capability. Nothing is implied.</dd>
        </div>
        <div>
          <dt>Audited server-side authorization</dt>
          <dd>
            Every action is checked and recorded by the API. Browser state can never grant access.
          </dd>
        </div>
      </dl>
    </section>
    <p class="studio-actions">
      <a class="button secondary" [href]="config.websiteUrl">Return to the public website</a>
    </p>`,
})
export class AccessDenied {
  readonly config = inject(RUNTIME_CONFIG);
}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<header class="page-header">
      <span class="eyebrow">404 / Page not found</span>
      <h1>This page does not exist.</h1>
      <p class="lead">No administrative action has been performed.</p>
    </header>
    <a class="button secondary" routerLink="/">Access information</a>`,
})
export class AdminNotFound {}

export const routes: Routes = [
  { path: '', title: 'Studio access restricted — Caelora Studio', component: AccessDenied },
  {
    path: 'access-denied',
    title: 'Studio access denied — Caelora Studio',
    component: AccessDenied,
  },
  { path: '**', title: 'Page not found — Caelora Studio', component: AdminNotFound },
];
