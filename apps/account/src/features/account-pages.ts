import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountApi, type AccountProfile } from '../core/account-api';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `<span class="eyebrow">Your account</span>
    <h1>Welcome back, {{ api.user()?.displayName }}.</h1>
    <p class="lead">Manage your Caelora identity and account security.</p>
    <div class="account-summary">
      <dl class="account-status-list">
        <div>
          <dt>Email address</dt>
          <dd>{{ api.user()?.email }}</dd>
        </div>
        <div>
          <dt>Email status</dt>
          <dd class="verified-label">
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
    <div class="notice">
      <h2>Your game ownership</h2>
      <p>
        Purchases, Steam linking and launcher downloads are not available yet. Creating an account
        does not grant a game entitlement.
      </p>
    </div>
    <div class="account-actions">
      <a class="button" routerLink="/account/profile">Edit profile</a
      ><a class="button secondary" routerLink="/account/security">Review security</a>
    </div>`,
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
  template: `<span class="eyebrow">Profile</span>
    <h1>A name of your own.</h1>
    <p class="lead">Update the name shown across your Caelora account.</p>
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
    <dl class="account-details">
      <dt>Email address</dt>
      <dd>{{ api.user()?.email }}</dd>
      <dt>Immutable account identifier</dt>
      <dd class="identifier">{{ api.user()?.accountId }}</dd>
    </dl>`,
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
  template: `<span class="eyebrow">Connection unavailable</span>
    <h1>The platform could not be reached.</h1>
    <p>
      Your session has not been treated as a successful sign-in. Try opening your account again when
      the API is available.
    </p>
    <a class="button" routerLink="/account">Try again</a
    ><a class="text-link" routerLink="/sign-in">Return to sign in</a>`,
})
export class ConnectionErrorPage {}
