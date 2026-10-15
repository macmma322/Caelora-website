import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
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
  @ViewChild('accountMenu') private accountMenu?: ElementRef<HTMLDetailsElement>;
  @ViewChild('mobileAccountMenu') private mobileAccountMenu?: ElementRef<HTMLDetailsElement>;

  closeMenus(): void {
    if (this.accountMenu) this.accountMenu.nativeElement.open = false;
    if (this.mobileAccountMenu) this.mobileAccountMenu.nativeElement.open = false;
  }

  @HostListener('document:keydown.escape')
  closeMenusWithEscape(): void {
    const openMenu = [this.accountMenu, this.mobileAccountMenu].find(
      (menu) => menu?.nativeElement.open,
    );
    if (!openMenu) return;
    openMenu.nativeElement.open = false;
    openMenu.nativeElement.querySelector<HTMLElement>('summary')?.focus();
  }

  async signout(): Promise<void> {
    this.closeMenus();
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
