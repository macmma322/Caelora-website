import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountApi } from '../core/account-api';

type Kind = 'register' | 'sign-in' | 'forgot-password' | 'reset-password' | 'verify-email';
const copy: Record<Kind, { label: string; title: string; description: string; action: string }> = {
  register: {
    label: 'Your first step',
    title: 'Make a place for yourself.',
    description:
      'Create your Caelora account. Game ownership and purchases are separate and are not available yet.',
    action: 'Create account',
  },
  'sign-in': {
    label: 'Welcome back',
    title: 'Return to Caelora.',
    description: 'Sign in with your verified email address.',
    action: 'Sign in',
  },
  'forgot-password': {
    label: 'Account recovery',
    title: 'Find your way back.',
    description:
      'Request a password reset link. The response is the same whether or not an eligible account exists.',
    action: 'Request reset link',
  },
  'reset-password': {
    label: 'A fresh beginning',
    title: 'Choose a new password.',
    description:
      'Reset your password using the link sent to your email. Existing browser sessions will end.',
    action: 'Reset password',
  },
  'verify-email': {
    label: 'Confirm your email',
    title: 'One last step.',
    description:
      'Open the verification link from your email, then confirm it here. You must verify your email before signing in.',
    action: 'Verify email',
  },
};
function matching(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('repeat')?.value
    ? null
    : { passwordMismatch: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-page.html',
})
export class AuthPage {
  readonly api = inject(AccountApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly builder = inject(FormBuilder);
  readonly kind = this.route.snapshot.data['kind'] as Kind;
  readonly text = copy[this.kind];
  private link = new URLSearchParams(this.route.snapshot.fragment ?? '');
  readonly hasLink = signal(!!this.link.get('userId') && !!this.link.get('token'));
  readonly passwordFields = ['register', 'sign-in', 'reset-password'].includes(this.kind);
  readonly repeated = ['register', 'reset-password'].includes(this.kind);
  get emailField(): boolean {
    return (
      ['register', 'sign-in', 'forgot-password'].includes(this.kind) ||
      (this.kind === 'verify-email' && !this.hasLink())
    );
  }
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly submitted = signal(false);
  readonly form = this.builder.nonNullable.group(
    {
      email: [
        this.api.pendingEmail(),
        this.emailField ? [Validators.required, Validators.email, Validators.maxLength(254)] : [],
      ],
      password: [
        '',
        this.passwordFields
          ? [Validators.required, Validators.minLength(12), Validators.maxLength(128)]
          : [],
      ],
      repeat: ['', this.repeated ? [Validators.required] : []],
      displayName: [
        '',
        this.kind === 'register'
          ? [Validators.required, Validators.minLength(2), Validators.maxLength(40)]
          : [],
      ],
    },
    { validators: this.repeated ? matching : null },
  );
  constructor() {
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      if (!fragment) return;
      this.link = new URLSearchParams(fragment);
      this.hasLink.set(!!this.link.get('userId') && !!this.link.get('token'));
      this.error.set('');
      this.message.set('');
      this.form.controls.email.setValidators(
        this.emailField ? [Validators.required, Validators.email, Validators.maxLength(254)] : [],
      );
      this.form.controls.email.updateValueAndValidity();
      window.history.replaceState(window.history.state, '', window.location.pathname);
    });
  }
  invalid(field: 'email' | 'password' | 'repeat' | 'displayName'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }
  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');
    this.message.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Check the highlighted fields before continuing.');
      return;
    }
    this.loading.set(true);
    const value = this.form.getRawValue();
    try {
      if (this.kind === 'sign-in') {
        this.api.notice.set('');
        const complete = await this.api.login(value.email.trim(), value.password);
        this.form.controls.password.reset();
        await this.router.navigateByUrl(complete ? '/account' : '/mfa-challenge');
      } else if (this.kind === 'register') {
        await this.api.request('/api/v1/auth/register', 'POST', {
          email: value.email.trim(),
          password: value.password,
          displayName: value.displayName.trim(),
        });
        this.api.pendingEmail.set(value.email.trim());
        await this.router.navigateByUrl('/verify-email');
      } else if (this.kind === 'forgot-password') {
        const response = await this.api.request<{ message: string }>(
          '/api/v1/auth/forgot-password',
          'POST',
          { email: value.email.trim() },
        );
        this.message.set(response.message);
      } else if (this.kind === 'verify-email') {
        const response = await this.api.request<{ message: string }>(
          this.hasLink() ? '/api/v1/auth/confirm-email' : '/api/v1/auth/resend-verification',
          'POST',
          this.hasLink()
            ? { userId: this.link.get('userId'), token: this.link.get('token') }
            : { email: value.email.trim() },
        );
        this.message.set(response.message);
      } else {
        if (!this.hasLink()) throw new Error('Open a password reset link from your email first.');
        const response = await this.api.request<{ message: string }>(
          '/api/v1/auth/reset-password',
          'POST',
          {
            userId: this.link.get('userId'),
            token: this.link.get('token'),
            password: value.password,
          },
        );
        this.api.user.set(null);
        this.message.set(response.message);
        this.form.reset();
      }
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'The request failed. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
