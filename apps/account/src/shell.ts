import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';
import { AccountApi } from './core/account-api';

@Component({
  selector: 'caelora-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
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
