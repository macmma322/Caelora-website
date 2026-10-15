import type { Routes } from '@angular/router';
import { AuthPage } from './features/auth-page';
import { OverviewPage, ProfilePage, ConnectionErrorPage } from './features/account-pages';
import { AccountNotFound, AccountUnavailable } from './features/information';
import { accountGuard } from './core/account-guard';
import { SecurityDashboard } from './features/security-page';
import { MfaSetupPage, MfaChallengePage, RecoveryCodesPage } from './features/mfa-pages';
import { NotificationsPage } from './features/notifications-page';

export const routes: Routes = [
  { path: 'mfa-challenge', component: MfaChallengePage, title: 'Confirm sign-in · Caelora' },
  { path: 'recovery-codes', component: RecoveryCodesPage, title: 'Recovery codes · Caelora' },
  {
    path: 'account/security/authenticator',
    component: MfaSetupPage,
    canActivate: [accountGuard],
    title: 'Enable authenticator · Caelora',
  },
  {
    path: 'account/notifications',
    component: NotificationsPage,
    canActivate: [accountGuard],
    title: 'Notifications · Caelora',
  },
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  ...['register', 'sign-in', 'verify-email', 'forgot-password', 'reset-password'].map((kind) => {
    const titles: Record<string, string> = {
      'sign-in': 'Sign in · Caelora',
      register: 'Create account · Caelora',
      'verify-email': 'Verify email · Caelora',
      'forgot-password': 'Forgot password · Caelora',
      'reset-password': 'Reset password · Caelora',
    };
    return { path: kind, title: titles[kind], component: AuthPage, data: { kind } };
  }),
  {
    path: 'account',
    component: OverviewPage,
    canActivate: [accountGuard],
    title: 'Your account · Caelora',
  },
  {
    path: 'account/profile',
    component: ProfilePage,
    canActivate: [accountGuard],
    title: 'Your profile · Caelora',
  },
  {
    path: 'account/security',
    component: SecurityDashboard,
    canActivate: [accountGuard],
    title: 'Account security · Caelora',
  },
  { path: 'account/sessions', redirectTo: 'account/security' },
  { path: 'account/ownership', component: AccountUnavailable, title: 'Game ownership · Caelora' },
  { path: 'account/devices', component: AccountUnavailable, title: 'Devices · Caelora' },
  {
    path: 'connection-error',
    component: ConnectionErrorPage,
    title: 'Connection unavailable · Caelora',
  },
  { path: '**', component: AccountNotFound, title: 'Page not found · Caelora' },
];
