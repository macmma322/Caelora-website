import { Component, inject, signal, type OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountApi, type AccountProfile } from '../core/account-api';
import { PlatformStatus } from '../shared/platform-status';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PlatformStatus],
  template: `
    <header class="page-header">
      <span class="eyebrow">Second factor</span>
      <h1>Confirm your sign-in.</h1>
      <p class="lead">
        Enter a fresh authenticator code, or use one of your single-use recovery codes.
      </p>
    </header>
    <caelora-platform-status />
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
    }
    @if (api.mfaChallenge()) {
      <form [formGroup]="form" (ngSubmit)="submit()" [attr.aria-busy]="busy()">
        <fieldset class="form-fieldset" [disabled]="!api.accountsOpen()">
          <div class="form-field">
            <label for="mfa-code">{{ recovery() ? 'Recovery code' : 'Authenticator code' }}</label>
            <input
              id="mfa-code"
              formControlName="code"
              autocomplete="one-time-code"
              [attr.inputmode]="recovery() ? 'text' : 'numeric'"
              maxlength="32"
              required
              aria-describedby="mfa-help"
            />
            <p id="mfa-help" class="field-help">
              {{
                recovery()
                  ? 'A recovery code can be used once.'
                  : 'Codes already used to activate or sign in cannot be reused. Wait for a fresh code.'
              }}
            </p>
          </div>
          <label class="checkbox-label"
            ><input
              type="checkbox"
              [checked]="recovery()"
              (change)="recovery.set(!recovery()); form.reset()"
            />
            Use a recovery code</label
          >
          <button class="button" [disabled]="busy() || form.invalid" [attr.aria-busy]="busy()">
            {{ busy() ? 'Verifying…' : 'Verify and sign in' }}
          </button>
        </fieldset>
      </form>
    } @else {
      <p>Your sign-in challenge is missing or expired. Start again.</p>
    }
    <nav class="auth-links" aria-label="Account help">
      <a routerLink="/sign-in">Return to sign in</a>
    </nav>
  `,
})
export class MfaChallengePage {
  readonly api = inject(AccountApi);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly recovery = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
  });
  async submit(): Promise<void> {
    if (this.form.invalid || this.busy() || !this.api.accountsOpen()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const profile = await this.api.request<AccountProfile>('/api/v1/auth/mfa', 'POST', {
        challenge: this.api.mfaChallenge(),
        code: this.form.controls.code.value,
        useRecoveryCode: this.recovery(),
      });
      this.api.user.set(profile);
      await this.router.navigateByUrl('/account');
      this.api.mfaChallenge.set('');
      this.form.reset();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <header class="page-header">
      <span class="eyebrow">Authenticator setup</span>
      <h1>Add an authenticator.</h1>
      <p class="lead">
        Use an authenticator app that supports TOTP. Setup expires after ten minutes. Activation
        ends all browser sessions.
      </p>
    </header>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
    }
    @if (secret()) {
      <ol class="setup-steps">
        <li>Scan the QR code in your authenticator app, or enter the setup key manually.</li>
        <li>Enter the first six-digit code from the app.</li>
        <li>Store the recovery codes shown after activation.</li>
      </ol>
      @if (qr()) {
        <img
          class="authenticator-qr"
          [src]="qr()"
          width="220"
          height="220"
          alt="Authenticator provisioning QR code. Use the setup key below if you cannot scan it."
        />
      }
      <p class="field-label">Setup key · Keep private</p>
      <code class="setup-secret" data-sensitive>{{ secret() }}</code>
      <details>
        <summary>Manual provisioning data</summary>
        <code class="provisioning-uri" data-sensitive>{{ uri() }}</code>
      </details>
      <form [formGroup]="form" (ngSubmit)="activate()">
        <div class="form-field">
          <label for="activation-code">First authenticator code</label>
          <input
            id="activation-code"
            formControlName="code"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="8"
            required
          />
        </div>
        <button class="button" [disabled]="busy() || form.invalid" [attr.aria-busy]="busy()">
          {{ busy() ? 'Confirming…' : 'Confirm and enable authenticator' }}
        </button>
      </form>
    } @else {
      <button class="button" (click)="prepare()" [disabled]="busy()" [attr.aria-busy]="busy()">
        {{ busy() ? 'Preparing…' : 'Prepare authenticator' }}
      </button>
    }
    <p class="field-help">
      If recent authentication is required, return to Security & sessions and confirm your identity.
    </p>
    <a class="text-link" routerLink="/account/security">Back to security</a>
  `,
})
export class MfaSetupPage implements OnDestroy {
  private readonly api = inject(AccountApi);
  private readonly router = inject(Router);
  readonly secret = signal('');
  readonly uri = signal('');
  readonly qr = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9 -]{6,8}$/)]],
  });
  async prepare(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const setup = await this.api.request<{ secret: string; provisioningUri: string }>(
        '/api/v1/me/mfa/enrollment',
        'POST',
        {},
      );
      this.secret.set(setup.secret);
      this.uri.set(setup.provisioningUri);
      const { default: QRCode } = await import('qrcode');
      this.qr.set(await QRCode.toDataURL(setup.provisioningUri, { width: 220, margin: 2 }));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Setup failed.');
    } finally {
      this.busy.set(false);
    }
  }
  async activate(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.request<{ recoveryCodes: string[]; message: string }>(
        '/api/v1/me/mfa/activate',
        'POST',
        this.form.getRawValue(),
      );
      this.api.recoveryCodes.set(result.recoveryCodes);
      this.api.notice.set(result.message);
      this.api.user.set(null);
      await this.router.navigateByUrl('/recovery-codes');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Activation failed.');
    } finally {
      this.form.reset();
      this.busy.set(false);
    }
  }
  ngOnDestroy(): void {
    this.secret.set('');
    this.uri.set('');
    this.qr.set('');
  }
}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <span class="eyebrow">Your recovery codes</span>
      <h1>Keep a way back in.</h1>
    </header>
    @if (api.recoveryCodes().length) {
      <div class="alert" role="status">{{ api.notice() }}</div>
      <p>
        Store these codes in a password manager or another secure place. Each works once. They will
        not be shown again after you leave this page. They are never saved in browser storage.
      </p>
      <div class="recovery-code-list" data-sensitive>
        @for (code of api.recoveryCodes(); track code) {
          <code>{{ code }}</code>
        }
      </div>
      <div class="account-actions">
        <button class="button secondary" (click)="copy()">Copy recovery codes</button>
        <a class="button" routerLink="/sign-in">I have stored my codes · Sign in</a>
      </div>
      <p role="status">{{ message() }}</p>
    } @else {
      <div class="empty-state">
        <h2>No codes to show.</h2>
        <p>No codes are available to display. Sign in to manage authenticator security.</p>
        <a class="button secondary" routerLink="/sign-in">Sign in</a>
      </div>
    }
  `,
})
export class RecoveryCodesPage implements OnDestroy {
  readonly api = inject(AccountApi);
  readonly message = signal('');
  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.api.recoveryCodes().join('\n'));
      this.message.set('Copied. Store the codes securely.');
    } catch {
      this.message.set('Clipboard unavailable. Select and copy the codes manually.');
    }
  }
  ngOnDestroy(): void {
    this.api.recoveryCodes.set([]);
  }
}
