import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';
import { AccountApi } from './core/account-api';

@Component({
  selector: 'caelora-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template:
    '<a class="skip-link" href="#main">Skip to content</a><header class="portal-header"><a class="portal-brand" [href]="config.websiteUrl"><img src="/brand/caelora-wordmark.webp" width="480" height="146" alt="Caelora" /></a><span class="eyebrow">Your account</span></header><div class="portal-layout"><nav class="portal-nav" aria-label="Account navigation">@if(api.user()){<a routerLink="/account" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" ariaCurrentWhenActive="page">Overview</a><a routerLink="/account/profile" routerLinkActive="active" ariaCurrentWhenActive="page">Profile</a><a routerLink="/account/security" routerLinkActive="active" ariaCurrentWhenActive="page">Security & sessions</a><a routerLink="/account/notifications" routerLinkActive="active" ariaCurrentWhenActive="page">Notifications <span class="notification-count" aria-label="Unread notifications">{{api.unread()===null?"—":api.unread()}}</span></a><button type="button" class="nav-signout" (click)="signout()" [disabled]="signingOut()">{{signingOut()?"Signing out…":"Sign out"}}</button>}@else{<a routerLink="/sign-in" routerLinkActive="active" ariaCurrentWhenActive="page">Sign in</a><a routerLink="/register" routerLinkActive="active" ariaCurrentWhenActive="page">Create account</a><a routerLink="/forgot-password" routerLinkActive="active" ariaCurrentWhenActive="page">Account recovery</a>}<a [href]="config.websiteUrl">Return to the world ↗</a></nav><main id="main">@if(error()){<div class="alert error" role="alert">{{error()}}</div>}<router-outlet /></main></div><footer class="portal-footer">Caelora · In development · Accounts are separate from game ownership.</footer>',
})
export class AccountShell {
  readonly config = inject(RUNTIME_CONFIG);
  readonly api = inject(AccountApi);
  private readonly router = inject(Router);
  readonly signingOut = signal(false);
  readonly error = signal('');
  async signout(): Promise<void> {
    this.signingOut.set(true);
    this.error.set('');
    try {
      await this.api.logout();
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Sign out failed. Please try again.');
    } finally {
      this.signingOut.set(false);
    }
  }
}
