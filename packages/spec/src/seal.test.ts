// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { computeContentSeal } from './seal.js';

describe('computeContentSeal', () => {
  const basePlaybook = {
    id: 'sample-service',
    name: 'Sample Service',
    category: 'software',
    website: 'https://example.com',
    status: 'active',
    revision: 1,
    contributors: ['alice'],
    reviewers: ['bob'],
    verified_on: '2026-11-01',
    verification_method: 'first-hand',
    channels: [
      {
        channel: 'direct',
        entry_url: 'https://example.com/cancel',
        steps: ['Log in to your account', 'Click Cancel subscription'],
        source: 'https://example.com/help',
      },
    ],
    auto_renews: {
      value: true,
      source: 'https://example.com/help',
      accessed_on: '2026-11-01',
    },
    merchant_patterns: ['SAMPLE*SERVICE*'],
    pattern_source: 'https://example.com/help',
    sources: [
      {
        url: 'https://example.com/help',
        accessed_on: '2026-11-01',
        sha256: 'a'.repeat(64),
      },
    ],
  };

  it('computes a 64-character lowercase hexadecimal hash', () => {
    const seal = computeContentSeal(basePlaybook);
    expect(seal).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for identical playbook content', () => {
    const seal1 = computeContentSeal(basePlaybook);
    const seal2 = computeContentSeal({ ...basePlaybook });
    expect(seal1).toBe(seal2);
  });

  it('detects changes in step text', () => {
    const sealOriginal = computeContentSeal(basePlaybook);
    const modified = {
      ...basePlaybook,
      channels: [
        {
          ...basePlaybook.channels[0],
          steps: ['Log in to your account', 'Click Cancel plan'],
        },
      ],
    };
    expect(computeContentSeal(modified)).not.toBe(sealOriginal);
  });

  it('detects changes in facts', () => {
    const sealOriginal = computeContentSeal(basePlaybook);
    const modified = {
      ...basePlaybook,
      auto_renews: {
        value: false,
        source: 'https://example.com/help',
        accessed_on: '2026-11-01',
      },
    };
    expect(computeContentSeal(modified)).not.toBe(sealOriginal);
  });

  it('detects changes in merchant patterns', () => {
    const sealOriginal = computeContentSeal(basePlaybook);
    const modified = {
      ...basePlaybook,
      merchant_patterns: ['SAMPLE*SERVICE*', 'SAMPLE*CORP*'],
    };
    expect(computeContentSeal(modified)).not.toBe(sealOriginal);
  });

  it('ignores metadata fields that do not represent core cancellation instructions', () => {
    const sealOriginal = computeContentSeal(basePlaybook);
    const metadataOnlyChange = {
      ...basePlaybook,
      status: 'broken',
      revision: 42,
      contributors: ['charlie'],
      reviewers: ['david'],
      verified_on: '2026-11-18',
      tags: ['survey-wall'],
      website: 'https://other.example.com',
      sources: [
        {
          url: 'https://example.com/help',
          accessed_on: '2026-11-18',
          sha256: 'b'.repeat(64),
        },
      ],
    };
    expect(computeContentSeal(metadataOnlyChange)).toBe(sealOriginal);
  });

  it('handles non-object and null inputs gracefully', () => {
    const sealNull = computeContentSeal(null);
    const sealUndefined = computeContentSeal(undefined);
    const sealString = computeContentSeal('not-an-object');

    expect(sealNull).toMatch(/^[a-f0-9]{64}$/);
    expect(sealNull).toBe(sealUndefined);
    expect(sealNull).toBe(sealString);
  });

  it('trims whitespace on steps', () => {
    const sealTrimmed = computeContentSeal(basePlaybook);
    const withWhitespace = {
      ...basePlaybook,
      channels: [
        {
          ...basePlaybook.channels[0],
          steps: ['  Log in to your account  ', 'Click Cancel subscription\n'],
        },
      ],
    };
    expect(computeContentSeal(withWhitespace)).toBe(sealTrimmed);
  });
});
