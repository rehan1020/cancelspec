// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanResult } from '../types.js';
import { createScannerApp } from './app.js';

describe('Tool UI & Scanner Client App (WP8)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'tool-app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it('renders initial intake screen with accessibility attributes and privacy banner', () => {
    const app = createScannerApp(container);

    const heading = container.querySelector('h2');
    expect(heading?.textContent).toContain('Drop in your bank statement');

    const banner = container.querySelector('.banner-success');
    expect(banner?.textContent).toContain('Zero-Data Guarantee');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.getAttribute('accept')).toBe('.csv,.tsv,.txt');

    const dropZone = container.querySelector('.dropzone');
    expect(dropZone?.getAttribute('role')).toBe('button');
    expect(dropZone?.getAttribute('tabindex')).toBe('0');

    app.destroy();
  });

  it('renders column mapping screen when mapping is required', () => {
    const app = createScannerApp(container);

    app.store.setState({
      screen: 'mapping',
      headers: ['Date', 'Merchant Name', 'Amount'],
      previewRows: [['2026-01-01', 'SPOTIFY', '10.99']],
      mappingChoices: {
        dateCol: 0,
        descCol: 1,
        mode: 'single',
        amountCol: 2,
        debitCol: 2,
        creditCol: 3,
        isDayFirst: true,
        isOutflowPositive: true,
        currency: 'USD',
      },
    });

    const mappingHeading = container.querySelector('#mapping-heading');
    expect(mappingHeading?.textContent).toBe('Review Column Mapping');

    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(4);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain('SPOTIFY');

    app.destroy();
  });

  it('renders results table with sorting, likely & possible sections, and totals', () => {
    const app = createScannerApp(container);

    const mockResult: ScanResult = {
      totalRowsProcessed: 100,
      durationMs: 45,
      currencyTotals: { USD: { totalAnnualized: 131.88, count: 1 } },
      subscriptions: [
        {
          id: 'sub-1',
          merchantKey: 'SPOTIFY USA',
          cadence: 'monthly',
          typicalAmount: 10.99,
          annualizedCost: 131.88,
          currency: 'USD',
          chargeCount: 12,
          firstDate: '2025-11-01',
          lastDate: '2026-10-01',
          confidenceScore: 85,
          tier: 'likely',
          isOverdue: false,
          matches: [],
          topMatch: {
            serviceId: 'spotify',
            serviceName: 'Spotify',
            region: 'GLOBAL',
            category: 'streaming-music',
            difficulty: 2,
            matchScore: 1.0,
          },
          transactions: [],
        },
        {
          id: 'sub-2',
          merchantKey: 'UNKNOWN SERVICE',
          cadence: 'annual',
          typicalAmount: 99.0,
          annualizedCost: 99.0,
          currency: 'USD',
          chargeCount: 1,
          firstDate: '2025-12-01',
          lastDate: '2025-12-01',
          confidenceScore: 45,
          tier: 'possible',
          isOverdue: false,
          matches: [],
          transactions: [],
        },
      ],
    };

    app.store.setState({
      screen: 'results',
      scanResult: mockResult,
    });

    const summary = container.querySelector('.card h2');
    expect(summary?.textContent).toBe('Scan Summary');

    // Totals badge
    const badge = container.querySelector('.badge-primary');
    expect(badge?.textContent).toContain('USD');
    expect(badge?.textContent).toContain('230.88'); // 131.88 + 99.00

    // Likely subscription table
    const likelyLink = container.querySelector('a[href="/services/global/spotify/"]');
    expect(likelyLink).not.toBeNull();
    expect(likelyLink?.textContent).toContain('See how to cancel');
    expect(likelyLink?.getAttribute('target')).toBe('_blank');
    expect(likelyLink?.getAttribute('rel')).toBe('noopener');

    // Possible section
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.textContent).toContain('Possible Subscriptions (1 items)');

    app.destroy();
  });

  it('supports in-memory exclusion ("Not a subscription") and cancellation ("Already cancelled")', () => {
    const app = createScannerApp(container);

    const mockResult: ScanResult = {
      totalRowsProcessed: 10,
      durationMs: 10,
      currencyTotals: { USD: { totalAnnualized: 120.0, count: 1 } },
      subscriptions: [
        {
          id: 'sub-1',
          merchantKey: 'ACME SUB',
          cadence: 'monthly',
          typicalAmount: 10.0,
          annualizedCost: 120.0,
          currency: 'USD',
          chargeCount: 12,
          firstDate: '2025-11-01',
          lastDate: '2026-10-01',
          confidenceScore: 75,
          tier: 'likely',
          isOverdue: false,
          matches: [],
          transactions: [],
        },
      ],
    };

    app.store.setState({
      screen: 'results',
      scanResult: mockResult,
    });

    // Mark as already cancelled
    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Already cancelled',
    );
    expect(cancelBtn).toBeDefined();
    cancelBtn!.click();

    expect(app.store.getState().cancelledSubIds.has('sub-1')).toBe(true);

    // Annualized total should now be 0.00 since it is cancelled
    const badge = container.querySelector('.badge-primary');
    expect(badge?.textContent).toContain('USD 0.00 / yr');

    // Undo cancel
    const undoBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Undo cancel',
    );
    expect(undoBtn).toBeDefined();
    undoBtn!.click();
    expect(app.store.getState().cancelledSubIds.has('sub-1')).toBe(false);

    // "Not a subscription" exclusion
    const notSubBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Not a subscription',
    );
    expect(notSubBtn).toBeDefined();
    notSubBtn!.click();

    expect(app.store.getState().excludedSubIds.has('sub-1')).toBe(true);
    expect(container.textContent).toContain('No subscriptions in this category.');

    app.destroy();
  });

  it('transitions to printable checklist view with clean layout', () => {
    const app = createScannerApp(container);

    const mockResult: ScanResult = {
      totalRowsProcessed: 10,
      durationMs: 10,
      currencyTotals: {},
      subscriptions: [
        {
          id: 'sub-1',
          merchantKey: 'SPOTIFY',
          cadence: 'monthly',
          typicalAmount: 10.99,
          annualizedCost: 131.88,
          currency: 'USD',
          chargeCount: 12,
          firstDate: '2025-11-01',
          lastDate: '2026-10-01',
          confidenceScore: 80,
          tier: 'likely',
          isOverdue: false,
          matches: [],
          transactions: [],
        },
      ],
    };

    app.store.setState({
      screen: 'checklist',
      scanResult: mockResult,
    });

    const checklistHeading = container.querySelector('#checklist-heading');
    expect(checklistHeading?.textContent).toBe('Cancellation Checklist');

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(1);

    app.destroy();
  });

  it('strictly adheres to zero-storage invariant (no localStorage or sessionStorage)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    const app = createScannerApp(container);

    // Trigger state changes
    app.store.setState({ screen: 'mapping' });
    app.store.setState({ screen: 'results' });

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');

    app.destroy();
  });
});
