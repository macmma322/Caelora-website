import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RUNTIME_CONFIG } from '../../../../packages/api-client/src/portal-bootstrap';
import { AccountApi, type AccountProfile } from '../core/account-api';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `<header class="page-header">
      <span class="eyebrow">Your account</span>
      <h1>Welcome back, {{ api.user()?.displayName }}.</h1>
      <p class="lead">Manage your Caelora identity and account security.</p>
      <p class="page-meta">
        @if (api.user()?.emailVerified) {
          <span class="status-tag" data-status="available">Email verified</span>
        } @else {
          <span class="status-tag" data-status="unavailable">Email not verified</span>
        }
      </p>
    </header>

    <section class="account-section" aria-labelledby="glance-title">
      <h2 id="glance-title">Account at a glance</h2>
      <div class="account-summary" [attr.aria-busy]="mfa() === null || sessions() === null">
        <dl class="account-status-list">
          <div>
            <dt>Email address</dt>
            <dd>{{ api.user()?.email }}</dd>
          </div>
          <div>
            <dt>Email status</dt>
            <dd [class.verified-label]="api.user()?.emailVerified">
              {{ api.user()?.emailVerified ? 'Verified' : 'Not verified' }}
            </dd>
          </div>
          <div>
            <dt>Authenticator</dt>
            <dd>{{ mfaLabel() }}</dd>
          </div>
          <div>
            <dt>Active sessions</dt>
            <dd>{{ sessionLabel() }}</dd>
          </div>
          <div>
            <dt>Account created</dt>
            <dd>{{ api.user()?.createdAt | date: 'longDate' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="account-section" aria-labelledby="manage-title">
      <h2 id="manage-title">Manage your account</h2>
      <ul class="portal-card-grid">
        <li>
          <a class="portal-card" routerLink="/account/profile">
            <h3>Profile</h3>
            <p>The display name shown across your account.</p>
            <span class="portal-card-cta">Edit profile <span aria-hidden="true">→</span></span>
          </a>
        </li>
        <li>
          <a class="portal-card" routerLink="/account/security">
            <h3>Security &amp; sessions</h3>
            <p>Authenticator protection, browser sessions and recent security activity.</p>
            <span class="portal-card-cta">Review security <span aria-hidden="true">→</span></span>
          </a>
        </li>
        <li>
          <a class="portal-card" routerLink="/account/notifications">
            <h3>Notifications</h3>
            <p>
              Stored security events.
              @if (api.unread() !== null) {
                {{ api.unread() }} unread.
              }
            </p>
            <span class="portal-card-cta">Open inbox <span aria-hidden="true">→</span></span>
          </a>
        </li>
      </ul>
    </section>

    <section class="account-section later-block" aria-labelledby="later-title">
      <h2 id="later-title">Later in development</h2>
      <p>
        These parts of your account are planned. None of them can be used yet, and creating an
        account does not grant a game entitlement.
      </p>
      <ul class="later-list">
        <li>
          <h3>Game ownership</h3>
          <span class="status-tag" data-status="planned">Planned</span>
          <p>Purchases, Steam linking and entitlement records.</p>
        </li>
        <li>
          <h3>Launcher access</h3>
          <span class="status-tag" data-status="planned">Planned</span>
          <p>Launcher downloads and sign-in for the desktop game.</p>
        </li>
        <li>
          <h3>Game-linked data</h3>
          <span class="status-tag" data-status="planned">Planned</span>
          <p>Information the game may one day connect to your account. Nothing is linked today.</p>
        </li>
      </ul>
    </section>`,
})
export class OverviewPage {
  readonly api = inject(AccountApi);
  readonly mfa = signal<{ enabled: boolean } | 'unavailable' | null>(null);
  readonly sessions = signal<number | 'unavailable' | null>(null);
  constructor() {
    void this.loadStatus();
  }
  mfaLabel(): string {
    const status = this.mfa();
    if (status === null) return 'Checking…';
    if (status === 'unavailable') return 'Unavailable';
    return status.enabled ? 'Enabled' : 'Not enabled';
  }
  sessionLabel(): string {
    const count = this.sessions();
    return count === null ? 'Checking…' : count === 'unavailable' ? 'Unavailable' : String(count);
  }
  private async loadStatus(): Promise<void> {
    const [mfa, security] = await Promise.allSettled([
      this.api.request<{ enabled: boolean }>('/api/v1/me/mfa'),
      this.api.request<{ sessions: unknown[] }>('/api/v1/me/security'),
    ]);
    this.mfa.set(mfa.status === 'fulfilled' ? mfa.value : 'unavailable');
    this.sessions.set(
      security.status === 'fulfilled' ? security.value.sessions.length : 'unavailable',
    );
  }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<header class="page-header">
      <span class="eyebrow">Profile</span>
      <h1>A name of your own.</h1>
      <p class="lead">Update the name shown across your Caelora account.</p>
    </header>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
    }
    @if (saved()) {
      <div class="alert success" role="status">Profile saved.</div>
    }
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="form-field">
        <label class="field-label" for="profile-name">Display name</label
        ><input
          id="profile-name"
          formControlName="displayName"
          autocomplete="nickname"
          maxlength="40"
          aria-describedby="profile-name-help profile-name-state"
          [attr.aria-invalid]="
            form.controls.displayName.touched && form.controls.displayName.invalid
          "
        />
        <span id="profile-name-help" class="field-help"
          >Use 2–40 characters. Your permanent account identifier does not change.</span
        >
        @if (form.controls.displayName.touched && form.controls.displayName.invalid) {
          <span class="field-error">Enter a display name of 2–40 characters.</span>
        }
      </div>
      <button class="button" [disabled]="loading() || form.pristine" [attr.aria-busy]="loading()">
        {{ loading() ? 'Saving…' : 'Save profile' }}
      </button>
      <span id="profile-name-state" class="form-state" aria-live="polite">{{
        form.dirty ? 'Unsaved changes' : 'No unsaved changes'
      }}</span>
    </form>
    <section class="account-section" aria-labelledby="profile-fixed-title">
      <h2 id="profile-fixed-title">Fixed details</h2>
      <dl class="account-details">
        <dt>Email address</dt>
        <dd>{{ api.user()?.email }}</dd>
        <dt>Immutable account identifier</dt>
        <dd class="identifier">{{ api.user()?.accountId }}</dd>
      </dl>
    </section>`,
})
export class ProfilePage {
  readonly api = inject(AccountApi);
  private readonly builder = inject(FormBuilder);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly loading = signal(false);
  readonly form = this.builder.nonNullable.group({
    displayName: [
      this.api.user()?.displayName ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(40)],
    ],
  });
  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      this.api.user.set(
        await this.api.request<AccountProfile>(
          '/api/v1/me/profile',
          'PUT',
          this.form.getRawValue(),
        ),
      );
      this.form.markAsPristine();
      this.saved.set(true);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Profile could not be saved.');
    } finally {
      this.loading.set(false);
    }
  }
}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<header class="page-header">
      <span class="eyebrow">Account services</span>
      <h1>Your account cannot be opened right now.</h1>
    </header>
    <section class="status-panel" role="status" data-tone="unavailable">
      @if (api.platform() === 'closed') {
        <span class="status-tag" data-status="unavailable">Account services are not open yet</span>
        <p>
          Caelora accounts open with a later development milestone. Nothing has been signed in or
          changed.
        </p>
      } @else {
        <span class="status-tag" data-status="unavailable">Account services can’t be reached</span>
        <p>
          The account service did not answer from here. It may not be open yet, or it may be briefly
          unavailable. Nothing has been signed in or changed.
        </p>
      }
      <div class="account-actions">
        <a class="button secondary" routerLink="/account">Try again</a>
        <a class="button ghost" [href]="config.websiteUrl">Return to the world</a>
      </div>
    </section>
    <nav class="auth-links" aria-label="Account help">
      <a routerLink="/sign-in">Return to sign in</a>
    </nav>`,
})
export class ConnectionErrorPage {
  readonly config = inject(RUNTIME_CONFIG);
  readonly api = inject(AccountApi);
  constructor() {
    void this.api.checkPlatform(true);
  }
}
