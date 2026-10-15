import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'caelora-confirmation-dialog',
  standalone: true,
  template: `
    <dialog
      #dialog
      class="confirmation-dialog"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      (close)="restoreFocus()"
    >
      <span class="eyebrow">Confirm action</span>
      <h2 id="confirmation-title">{{ title }}</h2>
      <p id="confirmation-description">{{ description }}</p>
      <div class="dialog-actions">
        <button
          class="button secondary"
          type="button"
          (click)="close()"
          [disabled]="busy"
          autofocus
        >
          Cancel
        </button>
        <button
          class="button"
          [class.danger]="danger"
          type="button"
          (click)="confirmed.emit()"
          [disabled]="busy"
          [attr.aria-busy]="busy"
        >
          {{ busy ? 'Applying…' : confirmLabel }}
        </button>
      </div>
    </dialog>
  `,
})
export class ConfirmationDialog {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) confirmLabel = '';
  @Input() danger = false;
  @Input() busy = false;
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  private trigger: HTMLElement | null = null;

  open(trigger: HTMLElement | null): void {
    this.trigger = trigger;
    this.dialog.nativeElement.showModal();
  }

  close(): void {
    this.dialog.nativeElement.close();
  }

  restoreFocus(): void {
    this.trigger?.focus();
    this.trigger = null;
    this.closed.emit();
  }
}
