// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateSyntheticStatement,
  type StatementConfig,
} from '../packages/core/src/fixtures/generator.js';

const fixturesDir = join(process.cwd(), 'fixtures');

// 1. US Statement
const usConfig: StatementConfig = {
  seed: 42,
  region: 'US',
  months: 12,
  startDate: '2025-11-01',
  delimiter: ',',
  dateFormat: 'MM/DD/YYYY',
  layout: 'single-signed',
  decimalSeparator: '.',
  hasPreamble: true,
  hasSummary: true,
  subscriptions: [
    {
      serviceId: 'netflix',
      merchantDescriptor: 'NETFLIX.COM* 1234',
      cadence: 'monthly',
      amount: 15.49,
      currency: 'USD',
      priceChangeMonth: 6,
      newAmount: 17.99,
    },
    {
      serviceId: 'spotify',
      merchantDescriptor: 'SPOTIFY USA* 5678',
      cadence: 'monthly',
      amount: 10.99,
      currency: 'USD',
    },
    {
      serviceId: 'hulu',
      merchantDescriptor: 'HULU* MONTHLY SUB',
      cadence: 'monthly',
      amount: 7.99,
      currency: 'USD',
    },
    {
      serviceId: 'new-york-times',
      merchantDescriptor: 'NYTIMES* DIGITAL',
      cadence: 'monthly',
      amount: 4.0,
      currency: 'USD',
      skipMonth: 4, // skipped month test
    },
    {
      serviceId: 'github',
      merchantDescriptor: 'GITHUB* PRO SUBSCRIPTION',
      cadence: 'monthly',
      amount: 4.0,
      currency: 'USD',
    },
    {
      serviceId: 'meal-kit',
      merchantDescriptor: 'FRESH MEALS WEEKLY POS',
      cadence: 'weekly',
      amount: 65.0,
      currency: 'USD',
    },
    {
      serviceId: 'fitness-club',
      merchantDescriptor: 'ANYTIME FITNESS DUES',
      cadence: 'biweekly',
      amount: 25.0,
      currency: 'USD',
    },
    {
      serviceId: 'cloud-vault',
      merchantDescriptor: 'CLOUD VAULT ANNUAL 99',
      cadence: 'annual',
      amount: 99.99,
      currency: 'USD',
    },
  ],
};

// 2. UK Statement
const ukConfig: StatementConfig = {
  seed: 101,
  region: 'UK',
  months: 12,
  startDate: '2025-11-01',
  delimiter: ',',
  dateFormat: 'DD/MM/YYYY',
  layout: 'debit-credit',
  decimalSeparator: '.',
  hasPreamble: true,
  hasSummary: false,
  subscriptions: [
    {
      serviceId: 'now-tv',
      merchantDescriptor: 'NOW TV ENTERTAINMENT DD',
      cadence: 'monthly',
      amount: 9.99,
      currency: 'GBP',
    },
    {
      serviceId: 'bbc-select',
      merchantDescriptor: 'BBC SELECT DIGITAL FP',
      cadence: 'monthly',
      amount: 4.99,
      currency: 'GBP',
    },
    {
      serviceId: 'spotify',
      merchantDescriptor: 'SPOTIFY UK DIRECT DEBIT',
      cadence: 'monthly',
      amount: 10.99,
      currency: 'GBP',
    },
    {
      serviceId: 'puregym',
      merchantDescriptor: 'PUREGYM MONTHLY DD',
      cadence: 'monthly',
      amount: 28.99,
      currency: 'GBP',
    },
    {
      serviceId: 'dev-quarterly',
      merchantDescriptor: 'JETBRAINS QUARTERLY SUB',
      cadence: 'quarterly',
      amount: 45.0,
      currency: 'GBP',
    },
  ],
};

// 3. EU Statement
const euConfig: StatementConfig = {
  seed: 202,
  region: 'EU',
  months: 12,
  startDate: '2025-11-01',
  delimiter: ';',
  dateFormat: 'DD/MM/YYYY',
  layout: 'single-signed',
  decimalSeparator: ',',
  hasPreamble: false,
  hasSummary: true,
  subscriptions: [
    {
      serviceId: 'deezer',
      merchantDescriptor: 'DEEZER PREMIUM SEPA DD',
      cadence: 'monthly',
      amount: 10.99,
      currency: 'EUR',
    },
    {
      serviceId: 'netflix',
      merchantDescriptor: 'NETFLIX SEPA LASTSCHRIFT',
      cadence: 'monthly',
      amount: 13.99,
      currency: 'EUR',
    },
    {
      serviceId: 'spotify',
      merchantDescriptor: 'SPOTIFY AB STOCKHOLM',
      cadence: 'monthly',
      amount: 10.99,
      currency: 'EUR',
    },
    {
      serviceId: 'nordvpn',
      merchantDescriptor: 'NORDVPN ANNUAL SUB',
      cadence: 'annual',
      amount: 59.88,
      currency: 'EUR',
    },
  ],
};

// 4. IN Statement
const inConfig: StatementConfig = {
  seed: 303,
  region: 'IN',
  months: 12,
  startDate: '2025-11-01',
  delimiter: ',',
  dateFormat: 'DD-MM-YYYY',
  layout: 'debit-credit',
  decimalSeparator: '.',
  hasPreamble: true,
  hasSummary: true,
  subscriptions: [
    {
      serviceId: 'hotstar',
      merchantDescriptor: 'UPI/NOVI DIGITAL/HOTSTAR/AUTOPAY',
      cadence: 'annual',
      amount: 1499.0,
      currency: 'INR',
    },
    {
      serviceId: 'times-prime',
      merchantDescriptor: 'UPI/TIMES INTERNET/SI MANDATE',
      cadence: 'annual',
      amount: 1199.0,
      currency: 'INR',
    },
    {
      serviceId: 'spotify',
      merchantDescriptor: 'SPOTIFY INDIA AUTOPAY',
      cadence: 'monthly',
      amount: 119.0,
      currency: 'INR',
    },
    {
      serviceId: 'google-one',
      merchantDescriptor: 'GOOGLE* STORAGE 100GB',
      cadence: 'monthly',
      amount: 130.0,
      currency: 'INR',
    },
  ],
};

export function runGenerator() {
  const configs = [
    { name: 'us', cfg: usConfig, ext: 'csv' },
    { name: 'uk', cfg: ukConfig, ext: 'csv' },
    { name: 'eu', cfg: euConfig, ext: 'csv' },
    { name: 'in', cfg: inConfig, ext: 'csv' },
  ];

  for (const item of configs) {
    const res = generateSyntheticStatement(item.cfg);
    const stmtPath = join(fixturesDir, `${item.name}-statement.${item.ext}`);
    const expPath = join(fixturesDir, `${item.name}-expected.json`);

    writeFileSync(stmtPath, res.csvText, 'utf8');
    writeFileSync(expPath, JSON.stringify(res.expected, null, 2) + '\n', 'utf8');

    console.log(`Generated ${item.name.toUpperCase()}: ${res.totalRows} rows -> ${stmtPath}`);
  }
}

runGenerator();
