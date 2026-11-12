import { Injectable, computed, inject, signal } from '@angular/core';
import { getPlatformInfo, PlatformInfoError } from '../../../../packages/api-client/src/index';
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
/**
 * `checking`: forms stay usable while the answer is pending (the server remains authoritative).
 * `closed`: no platform API at the configured origin, or it reports accounts as not open.
 * `unreachable`: no usable answer after one retry (network, CORS, timeout, 5xx, 429). Forms are
 * paused because a submission cannot succeed either; the wording does not claim a cause.
 */
export type PlatformStatus = 'checking' | 'available' | 'closed' | 'unreachable';
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
  /** Whether the platform API answers its public contract and reports accounts as open. */
  readonly platform = signal<PlatformStatus>('checking');
  readonly platformRechecking = signal(false);
  readonly accountsOpen = computed(() => ['checking', 'available'].includes(this.platform()));
  private platformCheck: Promise<void> | null = null;
  /** Checks once and caches; pass `force` to ask again. A transient failure is retried once. */
  checkPlatform(force = false): Promise<void> {
    if (this.platformCheck && !force) return this.platformCheck;
    this.platformRechecking.set(true);
    const read = (): Promise<PlatformStatus> =>
      getPlatformInfo(this.config.apiBaseUrl, fetch).then(
        (info) => (info.accountsAvailable ? 'available' : 'closed'),
        (error: unknown) =>
          error instanceof PlatformInfoError && error.reason === 'absent'
            ? 'closed'
            : 'unreachable',
      );
    this.platformCheck = read()
      .then((status) =>
        status === 'unreachable'
          ? new Promise<PlatformStatus>((resolve) => setTimeout(() => resolve(read()), 1500))
          : status,
      )
      .then((status) => {
        this.platform.set(status);
        this.platformRechecking.set(false);
      });
    return this.platformCheck;
  }
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
