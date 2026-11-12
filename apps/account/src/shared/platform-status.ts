import { Component, inject } from '@angular/core';
import { RUNTIME_CONFIG } from '../../../../packages/api-client/src/portal-bootstrap';
import { AccountApi } from '../core/account-api';

/** Truthful availability line for pages that submit to the platform API. */
@Component({
  selector: 'caelora-platform-status',
  standalone: true,
  template: `
    <div role="status" aria-live="polite" class="platform-status-region">
      @if (api.platform() === 'checking') {
        <p class="status-line">
          <span class="status-line-mark" aria-hidden="true"></span>Checking account services…
        </p>
      } @else if (api.platform() === 'closed') {
        <section class="status-panel" data-tone="unavailable" aria-labelledby="platform-closed">
          <span class="status-tag" data-status="unavailable" id="platform-closed"
            >Account services are not open yet</span
          >
          <p>
            Caelora accounts open with a later development milestone. Nothing entered here can be
            saved yet, so the form is paused.
          </p>
        </section>
      } @else if (api.platform() === 'unreachable') {
        <section
          class="status-panel"
          data-tone="unavailable"
          aria-labelledby="platform-unreachable"
        >
          <span class="status-tag" data-status="unavailable" id="platform-unreachable"
            >Account services can’t be reached</span
          >
          <p>
            The account service did not answer from here. It may not be open yet, or it may be
            briefly unavailable, so the form is paused until it responds.
          </p>
        </section>
      }
    </div>
    @if (api.platform() === 'closed' || api.platform() === 'unreachable') {
      <div class="account-actions platform-status-actions">
        <button
          type="button"
          class="button secondary"
          (click)="retry()"
          [attr.aria-disabled]="api.platformRechecking()"
          [attr.aria-busy]="api.platformRechecking()"
        >
          {{ api.platformRechecking() ? 'Checking…' : 'Check again' }}
        </button>
        <a class="button ghost" [href]="config.websiteUrl">Return to the world</a>
      </div>
    }
  `,
})
export class PlatformStatus {
  readonly api = inject(AccountApi);
  readonly config = inject(RUNTIME_CONFIG);
  constructor() {
    void this.api.checkPlatform();
  }
  retry(): void {
    if (!this.api.platformRechecking()) void this.api.checkPlatform(true);
  }
}
