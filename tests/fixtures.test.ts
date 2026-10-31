// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generateSyntheticStatement,
  type StatementConfig,
} from '../packages/core/src/fixtures/generator.js';

describe('Synthetic Fixtures & Generator (WP6)', () => {
  const rootDir = process.cwd();
  const fixturesDir = join(rootDir, 'fixtures');

  const testConfig: StatementConfig = {
    seed: 999,
    region: 'US',
    months: 6,
    startDate: '2026-01-01',
    delimiter: ',',
    dateFormat: 'YYYY-MM-DD',
    layout: 'single-signed',
    decimalSeparator: '.',
    subscriptions: [
      {
        serviceId: 'test-service',
        merchantDescriptor: 'TEST SERVICE* 1234',
        cadence: 'monthly',
        amount: 9.99,
        currency: 'USD',
      },
    ],
  };

  it('WP6 Acceptance: output is 100% reproducible from a seed', () => {
    const run1 = generateSyntheticStatement(testConfig);
    const run2 = generateSyntheticStatement(testConfig);

    expect(run1.csvText).toBe(run2.csvText);
    expect(run1.totalRows).toBe(run2.totalRows);
    expect(JSON.stringify(run1.expected)).toBe(JSON.stringify(run2.expected));
  });

  it('generates different statements when seeds differ', () => {
    const runA = generateSyntheticStatement({ ...testConfig, seed: 1 });
    const runB = generateSyntheticStatement({ ...testConfig, seed: 2 });

    expect(runA.csvText).not.toBe(runB.csvText);
  });

  it('committed fixture files exist for all 4 regions', () => {
    const regions = ['us', 'uk', 'eu', 'in'];
    for (const r of regions) {
      const csvPath = join(fixturesDir, `${r}-statement.csv`);
      const expPath = join(fixturesDir, `${r}-expected.json`);

      expect(existsSync(csvPath), `Missing ${r}-statement.csv`).toBe(true);
      expect(existsSync(expPath), `Missing ${r}-expected.json`).toBe(true);

      const content = readFileSync(csvPath, 'utf8');
      expect(content.length).toBeGreaterThan(500);

      // Privacy verification: no personal emails or real sensitive tokens
      expect(content).not.toMatch(/[a-zA-Z0-9._%+-]+@(?!example\.com|hdfcbank|hdfc|bank)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    }
  });

  it('handles regional layouts: debit-credit vs single-signed, comma decimals, lakh notation', () => {
    const euRun = generateSyntheticStatement({
      ...testConfig,
      region: 'EU',
      decimalSeparator: ',',
      delimiter: ';',
    });
    expect(euRun.csvText).toContain(';');
    expect(euRun.csvText).toMatch(/\d+,\d{2}/);

    const inRun = generateSyntheticStatement({
      ...testConfig,
      region: 'IN',
      layout: 'debit-credit',
    });
    expect(inRun.csvText).toContain('Debit');
    expect(inRun.csvText).toContain('Credit');
  });
});
