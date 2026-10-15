import { ChangeDetectorRef, Component, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountApi, type SecurityOverview } from '../core/account-api';
import { ConfirmationDialog } from '../shared/confirmation-dialog';

type Action = {
  kind: 'selected' | 'others' | 'everywhere' | 'regenerate' | 'disable';
  id?: string;
  title: string;
  description: string;
};
@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, ConfirmationDialog],
  templateUrl: './security-page.html',
})
export class SecurityDashboard {
  readonly api = inject(AccountApi);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly data = signal<SecurityOverview | null>(null);
  readonly mfa = signal<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly confirmation = signal<Action | null>(null);
  @ViewChild(ConfirmationDialog) private dialog!: ConfirmationDialog;
  readonly showPassword = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.maxLength(128)]],
    code: ['', [Validators.maxLength(16)]],
  });
  constructor() {
    void this.load();
  }
  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [security, mfa] = await Promise.all([
        this.api.request<SecurityOverview>('/api/v1/me/security'),
        this.api.request<{ enabled: boolean; recoveryCodesRemaining: number }>('/api/v1/me/mfa'),
      ]);
      this.data.set(security);
      this.mfa.set(mfa);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Security details could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  async reauthenticate(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const response = await this.api.request<{ message: string }>(
        '/api/v1/me/reauthenticate',
        'POST',
        this.form.getRawValue(),
      );
      this.message.set(response.message);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Identity confirmation failed.');
    } finally {
      this.form.reset();
      this.busy.set(false);
    }
  }
  ask(kind: Action['kind'], id?: string): void {
    const text =
      kind === 'disable'
        ? [
            'Disable authenticator?',
            'Authenticator protection will be removed and all browser sessions will end.',
          ]
        : kind === 'regenerate'
          ? [
              'Replace recovery codes?',
              'Previous recovery codes will stop working. All browser sessions will end and new codes will be displayed once.',
            ]
          : kind === 'everywhere'
            ? ['Sign out everywhere?', 'Every browser session, including this one, will end.']
            : kind === 'others'
              ? [
                  'Sign out other sessions?',
                  'All other browser sessions will end. This session will remain signed in.',
                ]
              : [
                  'End this browser session?',
                  'The selected browser session will lose access on its next request.',
                ];
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.confirmation.set({ kind, id, title: text[0]!, description: text[1]! });
    this.changeDetector.detectChanges();
    this.dialog.open(trigger);
  }
  async confirm(): Promise<void> {
    const action = this.confirmation();
    if (!action || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      if (action.kind === 'disable' || action.kind === 'regenerate') {
        const result = await this.api.request<{ recoveryCodes: string[] | null; message: string }>(
          '/api/v1/me/mfa/' + (action.kind === 'disable' ? 'disable' : 'recovery-codes'),
          'POST',
          {},
        );
        this.api.user.set(null);
        this.api.unread.set(null);
        this.api.notice.set(result.message);
        this.dialog.close();
        if (result.recoveryCodes?.length) {
          this.api.recoveryCodes.set(result.recoveryCodes);
          await this.router.navigateByUrl('/recovery-codes');
        } else await this.router.navigateByUrl('/sign-in');
      } else {
        const result = await this.api.request<{ message: string; signedOut: boolean }>(
          '/api/v1/me/sessions/revoke',
          'POST',
          { scope: action.kind, sessionId: action.id },
        );
        this.message.set(result.message);
        this.dialog.close();
        if (result.signedOut) {
          this.api.user.set(null);
          this.api.unread.set(null);
          this.api.notice.set(result.message);
          await this.router.navigateByUrl('/sign-in');
        } else {
          await this.load();
          await this.api.refreshUnread();
        }
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'The action failed.');
      this.dialog.close();
    } finally {
      this.busy.set(false);
    }
  }
  label(kind: string): string {
    return (
      (
        {
          BrowserSignedIn: 'Browser signed in',
          BrowserSignedOut: 'Browser signed out',
          EmailVerified: 'Email verified',
          AccountRegistered: 'Account created',
          ProfileUpdated: 'Profile updated',
          PasswordReset: 'Password reset',
          MfaEnabled: 'Authenticator enabled',
          MfaDisabled: 'Authenticator disabled',
          RecoveryCodesRegenerated: 'Recovery codes replaced',
          SessionsRevoked: 'Browser sessions ended',
          LoginRejected: 'Sign-in rejected',
          LoginLocked: 'Sign-in temporarily locked',
        } as Record<string, string>
      )[kind] ?? 'Security activity'
    );
  }
}
