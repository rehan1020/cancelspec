// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Playbook } from '@cancelspec/spec';
import {
  buildAliasIndex,
  computeDifficulty,
  computeStalenessDays,
  createReleaseBundle,
  isAccessibleToCancel,
  loadAllPlaybooks,
  normalizeMerchant,
  serializeDeterministicJson,
} from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Difficulty Scoring Rubric v0', () => {
  const basePlaybook: Playbook = {
    id: 'test-service',
    name: 'Test Service',
    category: 'software',
    website: 'https://example.com',
    merchant_patterns: ['TEST*'],
    channels: [
      {
        channel: 'direct',
        steps: ['Log in', 'Click Cancel'],
      },
    ],
    contributors: ['bot'],
    reviewers: ['rev'],
    verified_on: '2026-10-31',
    verification_method: 'official-help-page',
    sources: [{ url: 'https://example.com/help', accessed_on: '2026-10-31' }],
    revision: 1,
    status: 'active',
    status_reason: 'Testing',
  };

  it('scores 1 for low friction and <= 3 steps', () => {
    expect(computeDifficulty(basePlaybook)).toBe(1);
  });

  it('adds 1 point for 4-6 steps', () => {
    const playbook: Playbook = {
      ...basePlaybook,
      channels: [
        {
          channel: 'direct',
          steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
        },
      ],
    };
    expect(computeDifficulty(playbook)).toBe(1); // 1 pt -> band 1
  });

  it('adds 2 points for 7+ steps', () => {
    const playbook: Playbook = {
      ...basePlaybook,
      channels: [
        {
          channel: 'direct',
          steps: ['1', '2', '3', '4', '5', '6', '7'],
        },
      ],
    };
    expect(computeDifficulty(playbook)).toBe(2); // 2 pts -> band 2
  });

  it('adds 2 points for phone-required', () => {
    const playbook: Playbook = {
      ...basePlaybook,
      tags: ['phone-required'],
    };
    expect(computeDifficulty(playbook)).toBe(2); // 2 pts -> band 2
  });

  it('accumulates multiple friction tags into higher bands', () => {
    const playbook: Playbook = {
      ...basePlaybook,
      channels: [
        {
          channel: 'direct',
          steps: ['1', '2', '3', '4', '5', '6', '7'], // 2 pts
        },
      ],
      tags: [
        'phone-required', // +2 = 4 pts
        'retention-offer', // +1 = 5 pts
        'survey-wall', // +0.5 = 5.5 pts -> band 4
      ],
    };
    expect(computeDifficulty(playbook)).toBe(4);

    const hardest: Playbook = {
      ...playbook,
      tags: [
        'phone-required', // +2
        'captcha', // +1
        'app-required', // +1
        'hidden-entry', // +1
        'retention-offer', // +1
      ], // 2 (steps) + 6 (tags) = 8 pts -> band 5
    };
    expect(computeDifficulty(hardest)).toBe(5);
  });

  it('computes staleness in days relative to reference date', () => {
    const ref = new Date('2026-10-31T00:00:00.000Z');
    expect(computeStalenessDays('2026-10-31', ref)).toBe(0);
    expect(computeStalenessDays('2026-10-01', ref)).toBe(30);
  });
});

describe('accessible_to_cancel Evaluation', () => {
  const basePlaybook: Playbook = {
    id: 'test',
    name: 'Test',
    category: 'software',
    website: 'https://example.com',
    merchant_patterns: ['TEST*'],
    channels: [{ channel: 'direct', steps: ['Cancel'] }],
    contributors: ['bot'],
    reviewers: ['rev'],
    verified_on: '2026-10-31',
    verification_method: 'official-help-page',
    sources: [{ url: 'https://example.com', accessed_on: '2026-10-31' }],
    revision: 1,
    status: 'active',
    status_reason: 'Testing',
  };

  it('is true when no barrier tag is present', () => {
    expect(isAccessibleToCancel(basePlaybook)).toBe(true);
  });

  it('is false when phone-required is present without accessible_alternative', () => {
    expect(isAccessibleToCancel({ ...basePlaybook, tags: ['phone-required'] })).toBe(false);
  });

  it('is false when captcha is present without accessible_alternative', () => {
    expect(isAccessibleToCancel({ ...basePlaybook, tags: ['captcha'] })).toBe(false);
  });

  it('is false when app-required is present without accessible_alternative', () => {
    expect(isAccessibleToCancel({ ...basePlaybook, tags: ['app-required'] })).toBe(false);
  });

  it('is true when barrier tag is present but accessible_alternative exists', () => {
    expect(
      isAccessibleToCancel({
        ...basePlaybook,
        tags: ['phone-required'],
        accessible_alternative: 'Online form available as accessible alternative',
      }),
    ).toBe(true);
  });
});

describe('Merchant Normalization', () => {
  it('strips card noise, numbers, and dates', () => {
    const raw = 'POS DEBIT 2026-10-15 SPOTIFY USA 4567891234';
    const result = normalizeMerchant(raw);
    expect(result.merchantKey).toBe('SPOTIFY USA');
  });

  it('detects PayPal prefix hint', () => {
    const raw = 'PAYPAL *NETFLIX COM';
    const result = normalizeMerchant(raw);
    expect(result.processorHint).toBe('paypal');
    expect(result.merchantKey).toBe('NETFLIX');
  });

  it('detects Google Play hint', () => {
    const raw = 'GOOGLE *PLAY DISNEY PLUS 1234';
    const result = normalizeMerchant(raw);
    expect(result.processorHint).toBe('google-play');
    expect(result.merchantKey).toBe('DISNEY PLUS');
  });

  it('handles UPI handles by stripping bank suffix', () => {
    const raw = 'UPI/AUTOPAY/HOTSTAR@HDFCBANK/TXN123456';
    const result = normalizeMerchant(raw);
    expect(result.merchantKey).toContain('HOTSTAR');
    expect(result.merchantKey).not.toContain('HDFCBANK');
  });

  it('limits output to at most 6 tokens', () => {
    const raw = 'ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE';
    const result = normalizeMerchant(raw);
    expect(result.tokens.length).toBeLessThanOrEqual(6);
  });
});

describe('Playbook Loader & Index', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooksDir = join(rootDir, 'playbooks');
  const refDate = new Date('2026-10-31T00:00:00.000Z');

  it('excludes drafts by default', () => {
    const playbooks = loadAllPlaybooks(playbooksDir, { referenceDate: refDate });
    expect(playbooks.length).toBe(0);
  });

  it('loads all reference playbooks with derived fields when includeDrafts is true', () => {
    const playbooks = loadAllPlaybooks(playbooksDir, { referenceDate: refDate, includeDrafts: true });
    expect(playbooks.length).toBeGreaterThanOrEqual(10);

    for (const p of playbooks) {
      expect(p.difficulty).toBeGreaterThanOrEqual(1);
      expect(p.difficulty).toBeLessThanOrEqual(5);
      expect(typeof p.accessible_to_cancel).toBe('boolean');
      expect(typeof p.staleness_days).toBe('number');
      expect(p.matcher_key).toBeTruthy();
    }
  });

  it('builds an alias index from loaded playbooks', () => {
    const playbooks = loadAllPlaybooks(playbooksDir, { referenceDate: refDate, includeDrafts: true });
    const index = buildAliasIndex(playbooks);

    expect(index.entries.length).toBeGreaterThan(0);
    expect(index.exactMap['SPOTIFY']).toBeDefined();
    expect(index.exactMap['NETFLIX']).toBeDefined();
  });
});

describe('Bundle Writer & Deterministic Output', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooksDir = join(rootDir, 'playbooks');
  const refDate = new Date('2026-10-31T00:00:00.000Z');

  it('produces identical serialized output across runs (OPEN-2)', () => {
    const playbooks = loadAllPlaybooks(playbooksDir, { referenceDate: refDate, includeDrafts: true });

    const bundle1 = createReleaseBundle(playbooks, { referenceDate: refDate });
    const bundle2 = createReleaseBundle(playbooks, { referenceDate: refDate });

    const json1 = serializeDeterministicJson(bundle1);
    const json2 = serializeDeterministicJson(bundle2);

    expect(json1).toBe(json2);
    expect(json1.length).toBeGreaterThan(500);
  });
});
