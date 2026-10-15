import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AccountApi } from './account-api';
export const accountGuard: CanActivateFn = async () => {
  const api = inject(AccountApi);
  const router = inject(Router);
  try {
    return (await api.current()) ? true : router.createUrlTree(['/sign-in']);
  } catch {
    return router.createUrlTree(['/connection-error']);
  }
};
