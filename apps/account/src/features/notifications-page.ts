import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AccountApi } from '../core/account-api';
interface Notice {
  id: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  createdAt: string;
  readAt: string | null;
}
interface NoticePage {
  items: Notice[];
  page: number;
  pageSize: number;
  total: number;
  unread: number;
}
@Component({
  standalone: true,
  imports: [DatePipe],
  template: `
    <span class="eyebrow">Security inbox</span>
    <h1>Your account, in view.</h1>
    <p>
      Notifications reflect stored security events. No location tracking or invented online status.
    </p>
    @if (error()) {
      <div class="alert error" role="alert">{{ error() }}</div>
      <button class="button secondary" (click)="load(page())">Try again</button>
    }
    @if (loading()) {
      <div class="loading-block" role="status">Loading notifications…</div>
    }
    @if (data(); as result) {
      <div class="notification-toolbar">
        <p>{{ result.unread }} unread · {{ result.total }} total</p>
        <button
          class="button secondary"
          (click)="read(null)"
          [disabled]="busy() || result.unread === 0"
        >
          Mark all as read
        </button>
      </div>
      <div class="notification-list">
        @for (item of result.items; track item.id) {
          <article [class.unread]="!item.readAt">
            <div class="notification-meta">
              <span class="notification-state" [class.is-unread]="!item.readAt">{{
                item.readAt ? 'Read' : 'Unread'
              }}</span>
              <span>{{ item.category }} · {{ item.severity }}</span>
            </div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.summary }}</p>
            <time [attr.datetime]="item.createdAt">{{ item.createdAt | date: 'medium' }}</time>
            @if (!item.readAt) {
              <button class="session-action" (click)="read(item.id)" [disabled]="busy()">
                Mark as read
              </button>
            }
          </article>
        } @empty {
          <p>No notifications yet.</p>
        }
      </div>
      <nav class="pagination" aria-label="Notification pages">
        <button
          class="button secondary"
          (click)="load(page() - 1)"
          [disabled]="loading() || page() === 1"
        >
          Previous</button
        ><span>Page {{ page() }}</span
        ><button
          class="button secondary"
          (click)="load(page() + 1)"
          [disabled]="loading() || page() * result.pageSize >= result.total"
        >
          Next
        </button>
      </nav>
    }
  `,
})
export class NotificationsPage {
  private readonly api = inject(AccountApi);
  readonly data = signal<NoticePage | null>(null);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  constructor() {
    void this.load(1);
  }
  async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.request<NoticePage>('/api/v1/me/notifications?page=' + page);
      this.page.set(page);
      this.data.set(result);
      this.api.unread.set(result.unread);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Notifications could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  async read(id: string | null): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.request('/api/v1/me/notifications/read', 'POST', {
        notificationId: id,
        all: id === null,
      });
      await this.load(this.page());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Notification could not be updated.');
    } finally {
      this.busy.set(false);
    }
  }
}
