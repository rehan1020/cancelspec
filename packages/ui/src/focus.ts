// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export class FocusManager {
  private previousActiveElement: HTMLElement | null = null;

  public saveFocus(): void {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      this.previousActiveElement = document.activeElement;
    }
  }

  public restoreFocus(): void {
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  public trapFocus(container: HTMLElement): () => void {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}
