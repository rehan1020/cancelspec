// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export class LiveAnnouncer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.initRegions();
    }
  }

  private initRegions(): void {
    if (this.politeRegion && this.assertiveRegion) return;

    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.className = 'sr-only';

    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';

    document.body.appendChild(this.politeRegion);
    document.body.appendChild(this.assertiveRegion);
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (typeof document === 'undefined') return;
    this.initRegions();

    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;
    if (region) {
      // Clear then set to re-trigger assistive tech
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 50);
    }
  }

  public destroy(): void {
    if (this.politeRegion?.parentNode) {
      this.politeRegion.parentNode.removeChild(this.politeRegion);
    }
    if (this.assertiveRegion?.parentNode) {
      this.assertiveRegion.parentNode.removeChild(this.assertiveRegion);
    }
    this.politeRegion = null;
    this.assertiveRegion = null;
  }
}
