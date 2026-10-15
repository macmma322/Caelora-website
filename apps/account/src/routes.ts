import type { Routes } from '@angular/router';
import { AuthPage } from './features/auth-page';
import {
  OverviewPage,
  ProfilePage,
  SecurityPage,
  ConnectionErrorPage,
} from './features/account-pages';
import { AccountNotFound, AccountUnavailable } from './features/information';
import { accountGuard } from './core/account-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  ...['register', 'sign-in', 'verify-email', 'forgot-password', 'reset-password'].map((kind) => ({
    path: kind,
    title:
      kind === 'sign-in'
        ? 'Sign in — Caelora'
        : kind === 'register'
          ? 'Create account — Caelora'
          : 'Account recovery — Caelora',
    component: AuthPage,
    data: { kind },
  })),
  {
    path: 'account',
    component: OverviewPage,
    canActivate: [accountGuard],
    title: 'Your account — Caelora',
  },
  {
    path: 'account/profile',
    component: ProfilePage,
    canActivate: [accountGuard],
    title: 'Your profile — Caelora',
  },
  {
    path: 'account/security',
    component: SecurityPage,
    canActivate: [accountGuard],
    title: 'Account security — Caelora',
  },
  { path: 'account/sessions', redirectTo: 'account/security' },
  { path: 'account/ownership', component: AccountUnavailable, title: 'Game ownership — Caelora' },
  { path: 'account/devices', component: AccountUnavailable, title: 'Devices — Caelora' },
  {
    path: 'connection-error',
    component: ConnectionErrorPage,
    title: 'Connection unavailable — Caelora',
  },
  { path: '**', component: AccountNotFound, title: 'Page not found — Caelora' },
];
