import { Injectable, inject, signal } from '@angular/core';
import { RUNTIME_CONFIG } from '../../../../packages/api-client/src/portal-bootstrap';

export interface AccountProfile {
  accountId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  createdAt: string;
}
export interface SecurityOverview {
  sessions: {
    id: string;
    createdAt: string;
    expiresAt: string;
    lastSeenAt: string;
    descriptor: string;
    isCurrent: boolean;
  }[];
  events: { kind: string; occurredAt: string }[];
}
export class AccountApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly config = inject(RUNTIME_CONFIG);
  readonly user = signal<AccountProfile | null>(null);
  readonly pendingEmail = signal('');
  readonly mfaChallenge = signal('');
  readonly recoveryCodes = signal<string[]>([]);
  readonly notice = signal('');
  readonly unread = signal<number | null>(null);
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (method !== 'GET') {
        const csrf = await this.request<{ token: string }>('/api/v1/auth/csrf');
        headers['X-Caelora-CSRF'] = csrf.token;
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(new URL(path, this.config.apiBaseUrl), {
        method,
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.status === 204) return undefined as T;
      const content: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const title =
          typeof content === 'object' &&
          content !== null &&
          'title' in content &&
          typeof content.title === 'string'
            ? content.title
            : 'The request could not be completed.';
        if (response.status === 401 && method === 'GET') this.user.set(null);
        throw new AccountApiError(
          response.status === 429 ? 'Too many attempts. Wait a minute before trying again.' : title,
          response.status,
        );
      }
      if (content === null)
        throw new AccountApiError(
          'The platform returned an invalid response. Please try again.',
          502,
        );
      return content as T;
    } catch (error) {
      if (error instanceof AccountApiError) throw error;
      throw new AccountApiError(
        'The platform could not be reached. Check the connection and try again.',
        0,
      );
    }
  }
  async current(): Promise<AccountProfile | null> {
    try {
      const profile = await this.request<AccountProfile>('/api/v1/me');
      this.user.set(profile);
      void this.refreshUnread();
      return profile;
    } catch (error) {
      if (error instanceof AccountApiError && error.status === 401) {
        this.user.set(null);
        return null;
      }
      throw error;
    }
  }
  async login(email: string, password: string): Promise<boolean> {
    const result = await this.request<AccountProfile | { mfaRequired: true; challenge: string }>(
      '/api/v1/auth/login',
      'POST',
      { email, password },
    );
    if ('mfaRequired' in result) {
      this.mfaChallenge.set(result.challenge);
      this.user.set(null);
      return false;
    }
    this.mfaChallenge.set('');
    this.user.set(result);
    void this.refreshUnread();
    return true;
  }
  async refreshUnread(): Promise<void> {
    try {
      this.unread.set((await this.request<{ unread: number }>('/api/v1/me/notifications')).unread);
    } catch {
      this.unread.set(null);
    }
  }
  async logout(): Promise<void> {
    await this.request('/api/v1/auth/logout', 'POST', {});
    this.user.set(null);
    this.unread.set(null);
    this.mfaChallenge.set('');
    this.recoveryCodes.set([]);
  }
}
