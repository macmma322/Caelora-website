import type { Routes } from '@angular/router';
import { WelcomePage } from './features/welcome';
import { SignInInformation, AccountUnavailable, AccountNotFound } from './features/information';

export const routes: Routes = [
  { path: '', title: 'Welcome — Caelora Account', component: WelcomePage },
  { path: 'sign-in', title: 'Sign-in information — Caelora', component: SignInInformation },
  // Public explanations only. No sensitive components, data fetches or mock session guards exist.
  ...[
    'account',
    'account/profile',
    'account/security',
    'account/sessions',
    'account/devices',
    'account/ownership',
  ].map((path) => ({
    path,
    component: AccountUnavailable,
    title: 'Account unavailable — Caelora',
  })),
  { path: '**', title: 'Page not found — Caelora Account', component: AccountNotFound },
];
