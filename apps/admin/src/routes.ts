import { Component } from '@angular/core';
import { RouterLink, type Routes } from '@angular/router';

@Component({
  standalone: true,
  template: `<span class="eyebrow">Restricted area</span>
    <h1>Administrative access<br />is unavailable.</h1>
    <p>No administrative functions or data are deployed in this milestone.</p>
    <div class="notice">
      <h2>Server authorization required</h2>
      <p>
        Future access will require a verified identity, an explicit administrative policy and
        audited server-side authorization. Browser state cannot grant access.
      </p>
    </div>`,
})
export class AccessDenied {}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<span class="eyebrow">404 / Page not found</span>
    <h1>This page does not exist.</h1>
    <p>No administrative action has been performed.</p>
    <a class="button secondary" routerLink="/">Access information</a>`,
})
export class AdminNotFound {}

export const routes: Routes = [
  { path: '', title: 'Access unavailable — Caelora Administration', component: AccessDenied },
  { path: 'access-denied', title: 'Access denied — Caelora', component: AccessDenied },
  { path: '**', title: 'Page not found — Caelora Administration', component: AdminNotFound },
];
