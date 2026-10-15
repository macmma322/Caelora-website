import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountApi, type AccountProfile, type SecurityOverview } from '../core/account-api';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `<span class="eyebrow">Your account</span>
    <h1>Welcome back,<br />{{ api.user()?.displayName }}.</h1>
    <p class="lead">A place for your identity, and the journeys still to come.</p>
    <div class="account-summary">
      <div>
        <span class="eyebrow">Email</span>
        <p>{{ api.user()?.email }}</p>
        <span class="verified-label">Verified</span>
      </div>
      <div>
        <span class="eyebrow">Account created</span>
        <p>{{ api.user()?.createdAt | date: 'longDate' }}</p>
      </div>
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
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<span class="eyebrow">Profile</span>
    <h1>A name of your own.</h1>
    <p>Your display name can change. Your internal account identifier stays the same.</p>
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
          [attr.aria-invalid]="
            form.controls.displayName.touched && form.controls.displayName.invalid
          "
        />
        @if (form.controls.displayName.touched && form.controls.displayName.invalid) {
          <span class="field-error">Enter 2–40 characters.</span>
        }
      </div>
      <button class="button" [disabled]="loading()">
        {{ loading() ? 'Saving…' : 'Save profile' }}
      </button>
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
  imports: [DatePipe, RouterLink],
  template: `<span class="eyebrow">Account security</span>
    <h1>Know your sessions.</h1>
    <p>These are browser sign-ins, separate from future launcher sessions and gameplay leases.</p>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
      <button class="button secondary" (click)="load()">Try again</button>
    }
    @if (loading()) {
      <div class="loading-block" role="status">Loading security activity…</div>
    }
    @if (data(); as overview) {
      <h2>Active browser sessions</h2>
      <div class="session-list">
        @for (session of overview.sessions; track session.id) {
          <article>
            <strong>{{
              session.isCurrent ? 'This browser session' : 'Another browser session'
            }}</strong>
            <p>
              Started {{ session.createdAt | date: 'medium' }}<br />Expires
              {{ session.expiresAt | date: 'medium' }}
            </p>
          </article>
        } @empty {
          <p>No active browser sessions were returned.</p>
        }
      </div>
      <h2>Recent security activity</h2>
      <div class="security-events">
        @for (event of overview.events; track $index) {
          <div>
            <span>{{ label(event.kind) }}</span
            ><time>{{ event.occurredAt | date: 'medium' }}</time>
          </div>
        } @empty {
          <p>No activity has been recorded yet.</p>
        }
      </div>
    }
    <div class="notice">
      <h2>Password recovery</h2>
      <p>
        Resetting your password ends all existing browser sessions. Use the email recovery flow to
        choose a new password.
      </p>
      <a routerLink="/forgot-password">Request password reset ↗</a>
    </div>
    <p class="field-help">
      Trusted-device controls and individual remote session termination are not implemented in this
      milestone. Sign out ends the current browser session on the server.
    </p>`,
})
export class SecurityPage {
  private readonly api = inject(AccountApi);
  readonly data = signal<SecurityOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.api.request<SecurityOverview>('/api/v1/me/security'));
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Security activity could not be loaded.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  label(kind: string): string {
    return (
      (
        {
          AccountRegistered: 'Account created',
          EmailVerified: 'Email verified',
          BrowserSignedIn: 'Browser signed in',
          BrowserSignedOut: 'Browser signed out',
          ProfileUpdated: 'Profile updated',
          PasswordReset: 'Password reset',
          LoginRejected: 'Sign-in rejected',
          LoginLocked: 'Sign-in temporarily locked',
          IdentityEmailDeliveryFailed: 'Email delivery failed',
        } as Record<string, string>
      )[kind] ?? 'Security activity recorded'
    );
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
