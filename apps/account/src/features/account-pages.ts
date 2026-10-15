import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountApi, type AccountProfile } from '../core/account-api';

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
