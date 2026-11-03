// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildAliasIndex, loadAllPlaybooks } from '@cancelspec/core';
import { parseFlexibleAmount } from './amounts.js';
import { scoreColumnMapping } from './column_mapping.js';
import { parseFlexibleDate } from './dates.js';
import { scanStatement } from './engine.js';
import { matchMerchantKey } from './matcher.js';
import { normalizeMerchant } from '@cancelspec/core';
import { detectDelimiter, parseDelimitedText } from './intake.js';
import { setupWorkerHandler, type WorkerInMessage, type WorkerOutMessage } from './worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scanner Intake & Parsing (Stages 1-4)', () => {
  it('detects delimiters correctly', () => {
    expect(detectDelimiter(['Date,Desc,Amount', '2026-01-01,Netflix,15.99'])).toBe(',');
    expect(detectDelimiter(['Date\tDesc\tAmount', '2026-01-01\tNetflix\t15.99'])).toBe('\t');
    expect(detectDelimiter(['Date;Desc;Amount', '2026-01-01;Netflix;15.99'])).toBe(';');
  });

  it('handles quoted fields and commas inside quotes', () => {
    const csv = 'Date,Desc,Amount\n2026-01-01,"Coffee, Inc",4.50\n';
    const rows = parseDelimitedText(csv);
    expect(rows.length).toBe(2);
    expect(rows[1]![1]).toBe('Coffee, Inc');
  });

  it('scores column mappings accurately', () => {
    const headers = ['Tx Date', 'Transaction Description', 'Charge Amount'];
    const rows = [
      ['2026-01-01', 'SPOTIFY PREMIUM', '10.99'],
      ['2026-02-01', 'SPOTIFY PREMIUM', '10.99'],
    ];
    const mapping = scoreColumnMapping(headers, rows);
    expect(mapping.dateCol).toBe(0);
    expect(mapping.descCol).toBe(1);
    expect(mapping.amountCol).toBe(2);
    expect(mapping.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('parses various date formats', () => {
    expect(parseFlexibleDate('2026-10-31')?.toISOString().slice(0, 10)).toBe('2026-10-31');
    expect(parseFlexibleDate('31/10/2026', true)?.toISOString().slice(0, 10)).toBe('2026-10-31');
    expect(parseFlexibleDate('10/31/2026', false)?.toISOString().slice(0, 10)).toBe('2026-10-31');
    expect(parseFlexibleDate('15-Jan-2026')?.toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('parses various amount formats (comma decimal, lakh, signs)', () => {
    expect(parseFlexibleAmount('1,234.56')).toBe(1234.56);
    expect(parseFlexibleAmount('1.234,56')).toBe(1234.56);
    expect(parseFlexibleAmount('(15.99)')).toBe(-15.99);
    expect(parseFlexibleAmount('15.99-')).toBe(-15.99);
    expect(parseFlexibleAmount('$10.99')).toBe(10.99);
    expect(parseFlexibleAmount('1,23,456.78')).toBe(123456.78);
  });
});

describe('Worker Protocol (Stage 11-12)', () => {
  it('processes scan via worker handler', async () => {
    const outMessages: WorkerOutMessage[] = [];
    const handler = setupWorkerHandler((msg) => {
      outMessages.push(msg);
    });

    const csv = `Date,Description,Amount\n2026-01-01,SPOTIFY,10.99\n2026-02-01,SPOTIFY,10.99\n2026-03-01,SPOTIFY,10.99\n`;

    const inMsg: WorkerInMessage = {
      type: 'SCAN_START',
      text: csv,
      options: { isDayFirst: false },
    };

    handler({ data: inMsg });

    expect(outMessages.some((m) => m.type === 'SCAN_PROGRESS')).toBe(true);
    const complete = outMessages.find((m) => m.type === 'SCAN_COMPLETE');
    expect(complete).toBeDefined();
  });
});

describe('Fixture Accuracy & Performance Acceptance (WP7)', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooksDir = join(rootDir, 'playbooks');
  const fixturesDir = join(rootDir, 'fixtures');

  const playbooks = loadAllPlaybooks(playbooksDir, {
    referenceDate: new Date('2026-10-31T00:00:00.000Z'),
    includeDrafts: true,
  });
  const aliasIndex = buildAliasIndex(playbooks);

  interface ExpectedSub {
    merchantKey: string;
    serviceId: string;
    cadence: string;
    chargeCount: number;
    typicalAmount: number;
    currency: string;
  }

  const testRegions = [
    { code: 'us', currency: 'USD', isDayFirst: false },
    { code: 'uk', currency: 'GBP', isDayFirst: true },
    { code: 'eu', currency: 'EUR', isDayFirst: true, delimiter: ';' },
    { code: 'in', currency: 'INR', isDayFirst: true },
  ];

  let totalExpected = 0;
  let totalTruePositives = 0;
  let totalFalsePositives = 0;

  for (const { code, currency, isDayFirst, delimiter } of testRegions) {
    it(`evaluates recall & precision on ${code.toUpperCase()} fixture`, () => {
      const csvPath = join(fixturesDir, `${code}-statement.csv`);
      const expPath = join(fixturesDir, `${code}-expected.json`);

      const csvText = readFileSync(csvPath, 'utf8');
      const expectedSubs = JSON.parse(readFileSync(expPath, 'utf8')) as ExpectedSub[];

      const startTime = performance.now();
      const result = scanStatement(csvText, {
        explicitDelimiter: delimiter,
        isDayFirst,
        currency,
        aliasIndex,
      });
      const duration = performance.now() - startTime;

      // Speed target: parsing statement under 2 seconds
      expect(duration).toBeLessThan(2000);

      // Evaluate accuracy against expected subscriptions
      let tp = 0;
      for (const exp of expectedSubs) {
        const found = result.subscriptions.find((s) => {
          const matchKey = s.merchantKey.toUpperCase();
          const expKey = exp.merchantKey.toUpperCase();
          const matchService = s.topMatch?.serviceId === exp.serviceId;
          const keyMatches = matchKey.includes(expKey) || expKey.includes(matchKey);
          return (matchService || keyMatches) && s.cadence === exp.cadence;
        });

        if (found) {
          tp++;
        }
      }

      const fn = expectedSubs.length - tp;
      const fp = Math.max(0, result.subscriptions.length - tp);

      totalExpected += expectedSubs.length;
      totalTruePositives += tp;
      totalFalsePositives += fp;

      const recall = tp / (tp + fn);
      const precision = tp / Math.max(1, tp + fp);

      // Recall >= 90%, Precision >= 85%
      expect(recall).toBeGreaterThanOrEqual(0.85); // per fixture threshold
      expect(precision).toBeGreaterThanOrEqual(0.80);
    });
  }

  it('meets overall recall >= 90% and precision >= 85% across all regions', () => {
    const overallRecall = totalTruePositives / totalExpected;
    const overallPrecision =
      totalTruePositives / (totalTruePositives + totalFalsePositives);

    console.log(
      `Accuracy metrics: Recall = ${(overallRecall * 100).toFixed(1)}% (Target >= 90%), Precision = ${(overallPrecision * 100).toFixed(1)}% (Target >= 85%)`,
    );

    expect(overallRecall).toBeGreaterThanOrEqual(0.90);
    expect(overallPrecision).toBeGreaterThanOrEqual(0.85);
  });
});

describe('Most-Specific-Pattern-Wins Rule & Disambiguation (Task 9 & 10)', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooks = loadAllPlaybooks(join(rootDir, 'playbooks'), {
    includeDrafts: true,
  });
  const aliasIndex = buildAliasIndex(playbooks);

  it('matches YouTube Premium over Google Play for Google Play billed YouTube Premium charges', () => {
    const rawDesc = 'GOOGLE *PLAY YOUTUBE PREMIUM';
    const norm = normalizeMerchant(rawDesc);
    const matches = matchMerchantKey(norm.merchantKey, norm.tokens, aliasIndex, norm.processorHint);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.serviceId).toBe('youtube-premium');
    expect(matches[0]!.serviceName).toBe('YouTube Premium');
    // Google Play is present as a secondary / channel-guide fallback hint
    const hasGooglePlayFallback = matches.some((m) => m.serviceId === 'google-play');
    expect(hasGooglePlayFallback).toBe(true);
    // YouTube Premium is ranked before Google Play
    const ytIndex = matches.findIndex((m) => m.serviceId === 'youtube-premium');
    const gpIndex = matches.findIndex((m) => m.serviceId === 'google-play');
    expect(ytIndex).toBeLessThan(gpIndex);
  });

  it('matches Google Play when charge is specifically for Google Play', () => {
    const rawDesc = 'GOOGLE *PLAY STORE';
    const norm = normalizeMerchant(rawDesc);
    const matches = matchMerchantKey(norm.merchantKey, norm.tokens, aliasIndex, norm.processorHint);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.serviceId).toBe('google-play');
    expect(matches[0]!.kind).toBe('channel-guide');
  });

  it('ordinary Google charge matches nothing', () => {
    const ordinaryCharges = [
      'GOOGLE *MOUNTAIN VIEW CA',
      'GOOGLE *SERVICES',
      'GOOGLE LLC',
      'GOOGLE *TEMPORARY HOLD',
      'GOOGLE',
      'GOOGLE *APPS',
    ];

    for (const rawDesc of ordinaryCharges) {
      const norm = normalizeMerchant(rawDesc);
      const matches = matchMerchantKey(norm.merchantKey, norm.tokens, aliasIndex);
      expect(matches).toEqual([]);
    }
  });

  it('longer literal text beats shorter literal text in matching order', () => {
    const testIndex = {
      entries: [
        {
          pattern: 'STREAMING SHORT*',
          normalizedPattern: 'STREAMING SHORT',
          literalText: 'STREAMING SHORT',
          literalLength: 15,
          serviceId: 'short-service',
          region: 'GLOBAL',
          serviceName: 'Short Service',
          category: 'software',
          isWildcard: true,
          tokens: ['STREAMING', 'SHORT'],
          kind: 'service' as const,
          outcome: 'cancel' as const,
        },
        {
          pattern: 'STREAMING SHORT EXTRA LONG*',
          normalizedPattern: 'STREAMING SHORT EXTRA LONG',
          literalText: 'STREAMING SHORT EXTRA LONG',
          literalLength: 26,
          serviceId: 'long-service',
          region: 'GLOBAL',
          serviceName: 'Long Service',
          category: 'software',
          isWildcard: true,
          tokens: ['STREAMING', 'SHORT', 'EXTRA', 'LONG'],
          kind: 'service' as const,
          outcome: 'cancel' as const,
        },
      ],
      exactMap: {},
    };

    const matches = matchMerchantKey(
      'STREAMING SHORT EXTRA LONG',
      ['STREAMING', 'SHORT', 'EXTRA', 'LONG'],
      testIndex as any,
    );
    expect(matches.length).toBe(2);
    expect(matches[0]!.serviceId).toBe('long-service');
    expect(matches[1]!.serviceId).toBe('short-service');
  });

  it('exact match beats prefix match', () => {
    const testIndex = {
      entries: [
        {
          pattern: 'STREAMBOX*',
          normalizedPattern: 'STREAMBOX',
          literalText: 'STREAMBOX',
          literalLength: 9,
          serviceId: 'streambox-prefix',
          region: 'GLOBAL',
          serviceName: 'Streambox Prefix',
          category: 'software',
          isWildcard: true,
          tokens: ['STREAMBOX'],
          kind: 'service' as const,
          outcome: 'cancel' as const,
        },
        {
          pattern: 'STREAMBOX',
          normalizedPattern: 'STREAMBOX',
          literalText: 'STREAMBOX',
          literalLength: 9,
          serviceId: 'streambox-exact',
          region: 'GLOBAL',
          serviceName: 'Streambox Exact',
          category: 'software',
          isWildcard: false,
          tokens: ['STREAMBOX'],
          kind: 'service' as const,
          outcome: 'cancel' as const,
        },
      ],
      exactMap: {},
    };

    const matches = matchMerchantKey('STREAMBOX', ['STREAMBOX'], testIndex as any);
    expect(matches.length).toBe(2);
    expect(matches[0]!.serviceId).toBe('streambox-exact');
    expect(matches[1]!.serviceId).toBe('streambox-prefix');
  });

  it('proves GOOGLE *FITBIT PREMIUM and GOOGLE *FIREBASE do not match Google Fi', () => {
    for (const rawDesc of ['GOOGLE *FITBIT PREMIUM', 'GOOGLE *FIREBASE']) {
      const norm = normalizeMerchant(rawDesc);
      const matches = matchMerchantKey(norm.merchantKey, norm.tokens, aliasIndex, norm.processorHint);
      const matchedFi = matches.some((m) => m.serviceId === 'google-fi');
      expect(matchedFi).toBe(false);
      expect(matches).toEqual([]);
    }
  });

  it('resolves APPLE.COM/BILL to the Apple channel guide', () => {
    const rawDesc = 'APPLE.COM/BILL';
    const norm = normalizeMerchant(rawDesc);
    const matches = matchMerchantKey(norm.merchantKey, norm.tokens, aliasIndex, norm.processorHint);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.serviceId).toBe('apple-subscriptions');
    expect(matches[0]!.kind).toBe('channel-guide');
  });

  it('attaches matching channel guide when charge carries processor hint and no service matches', () => {
    // Apple hint
    const appleNorm = normalizeMerchant('APPLE *UNKNOWN APP');
    const appleMatches = matchMerchantKey(
      appleNorm.merchantKey,
      appleNorm.tokens,
      aliasIndex,
      appleNorm.processorHint,
    );
    expect(appleMatches.length).toBeGreaterThan(0);
    expect(appleMatches[0]!.serviceId).toBe('apple-subscriptions');
    expect(appleMatches[0]!.kind).toBe('channel-guide');

    // Google Play hint
    const gpNorm = normalizeMerchant('GOOGLE *PLAY UNKNOWN APP');
    const gpMatches = matchMerchantKey(
      gpNorm.merchantKey,
      gpNorm.tokens,
      aliasIndex,
      gpNorm.processorHint,
    );
    expect(gpMatches.length).toBeGreaterThan(0);
    expect(gpMatches[0]!.serviceId).toBe('google-play');
    expect(gpMatches[0]!.kind).toBe('channel-guide');

    // PayPal hint
    const ppNorm = normalizeMerchant('PAYPAL *RANDOM STORE');
    const ppMatches = matchMerchantKey(
      ppNorm.merchantKey,
      ppNorm.tokens,
      aliasIndex,
      ppNorm.processorHint,
    );
    expect(ppMatches.length).toBeGreaterThan(0);
    expect(ppMatches[0]!.serviceId).toBe('paypal');
    expect(ppMatches[0]!.kind).toBe('channel-guide');
  });

  it('service playbook takes precedence over channel guide for processor hints', () => {
    const norm = normalizeMerchant('PAYPAL *NETFLIX COM');
    const matches = matchMerchantKey(
      norm.merchantKey,
      norm.tokens,
      aliasIndex,
      norm.processorHint,
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.serviceId).toBe('netflix');
    expect(matches[0]!.kind).toBe('service');
  });
});
