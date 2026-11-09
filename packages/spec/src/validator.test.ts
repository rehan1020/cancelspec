// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SPEC_VERSION } from './constants.js';
import { estimateFleschKincaidGrade, validatePlaybook } from './validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Specification version', () => {
  it('exposes the spec version constant', () => {
    expect(SPEC_VERSION).toBe('0.1.0');
  });
});

describe('Readability estimator', () => {
  it('estimates low grade for simple instructions', () => {
    const text = 'Log into your account. Select Settings. Click Cancel.';
    const grade = estimateFleschKincaidGrade(text);
    expect(grade).toBeLessThanOrEqual(8.0);
  });
});

describe('Conformance fixtures — 10 Reference Playbooks', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooksDir = join(rootDir, 'playbooks');
  const regions = ['GLOBAL', 'US', 'UK', 'EU', 'IN'];

  const playbookFiles: Array<{ region: string; file: string; path: string }> = [];

  for (const region of regions) {
    const dir = join(playbooksDir, region);
    const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      playbookFiles.push({ region, file, path: join(dir, file) });
    }
  }

  it('found at least 10 reference playbooks', () => {
    expect(playbookFiles.length).toBeGreaterThanOrEqual(10);
  });

  for (const { region, file, path } of playbookFiles) {
    it(`validates ${region}/${file} successfully`, () => {
      const content = readFileSync(path, 'utf8');
      const data = parse(content);
      const result = validatePlaybook(data);

      if (!result.valid) {
        console.error(`Validation failed for ${region}/${file}:`, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  }
});

describe('Conformance fixtures — Invalid Playbooks rejected with clear messages', () => {
  const baseValidPlaybook = {
    id: 'test-service',
    name: 'Test Service',
    category: 'software',
    website: 'https://testservice.com',
    merchant_patterns: ['TEST SERVICE*'],
    channels: [
      {
        channel: 'direct',
        entry_url: 'https://testservice.com/cancel',
        source: 'https://testservice.com/cancel',
        steps: ['Log into your account and select Cancel.'],
      },
    ],
    contributors: ['tester'],
    reviewers: ['reviewer'],
    verified_on: '2026-10-31',
    verification_method: 'official-help-page',
    sources: [
      {
        url: 'https://testservice.com/cancel',
        accessed_on: '2026-10-31',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    revision: 1,
    status: 'active',
    status_reason: 'Verified for testing.',
  };

  it('rejects non-object input', () => {
    const result = validatePlaybook('not-an-object');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain('must be an object');
  });

  it('rejects unknown properties', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      unexpected_field: 'invalid',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Unknown property: unexpected_field'))).toBe(true);
  });

  it('rejects invalid id formatting (uppercase, underscores, spaces)', () => {
    const invalidIds = ['TestService', 'test_service', 'test service', 'test@service', '-leading-dash'];
    for (const badId of invalidIds) {
      const result = validatePlaybook({ ...baseValidPlaybook, id: badId });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'id')).toBe(true);
    }
  });

  it('rejects HTML in text fields', () => {
    const withHtml = {
      ...baseValidPlaybook,
      name: 'Service with <script>alert(1)</script>',
    };
    const result = validatePlaybook(withHtml);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('HTML or Markdown'))).toBe(true);
  });

  it('rejects Markdown in text fields', () => {
    const withMarkdown = {
      ...baseValidPlaybook,
      name: 'Service with [link](https://example.com)',
    };
    const result = validatePlaybook(withMarkdown);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('HTML or Markdown'))).toBe(true);
  });

  it('rejects invalid category enum', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      category: 'non-existent-category',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'category')).toBe(true);
  });

  it('rejects invalid channel enum', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      channels: [{ channel: 'telepathy', steps: ['Think about cancelling'] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'channels[0].channel')).toBe(true);
  });

  it('rejects step exceeding 200 characters', () => {
    const longAction = 'A'.repeat(201);
    const result = validatePlaybook({
      ...baseValidPlaybook,
      channels: [
        {
          channel: 'direct',
          steps: [longAction],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('exceeds 200 characters'))).toBe(true);
  });

  it('rejects banned legal-advice phrases', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      channels: [
        {
          channel: 'direct',
          steps: ['You have a legal right under the law to demand a refund immediately.'],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('banned legal phrase'))).toBe(true);
  });

  it('rejects non-https URLs', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      website: 'http://insecure.example.com',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'website')).toBe(true);
  });

  it('rejects lowercase merchant patterns', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      merchant_patterns: ['lowercase pattern*'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('uppercase'))).toBe(true);
  });

  it('rejects invalid date format for verified_on', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      verified_on: '31/10/2026',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'verified_on')).toBe(true);
  });

  it('rejects active status when verified_on is missing or invalid', () => {
    const result = validatePlaybook({
      ...baseValidPlaybook,
      status: 'active',
      verified_on: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('cannot leave draft status'))).toBe(true);
  });

  it('rejects merchant patterns whose literal text is shorter than 6 characters', () => {
    const resultShort = validatePlaybook({
      ...baseValidPlaybook,
      merchant_patterns: ['HULU*', 'SPOTIFY*'],
    });
    expect(resultShort.valid).toBe(false);
    expect(resultShort.errors.some((e) => e.message.includes('at least 6 characters'))).toBe(true);

    const resultValid = validatePlaybook({
      ...baseValidPlaybook,
      merchant_patterns: ['HULU.COM*', 'SPOTIFY*'],
    });
    expect(resultValid.valid).toBe(true);
  });

  it('validates playbook kind (service vs channel-guide) and prevents aliases on channel-guides', () => {
    const resultGuideValid = validatePlaybook({
      ...baseValidPlaybook,
      kind: 'channel-guide',
      aliases: undefined,
    });
    expect(resultGuideValid.valid).toBe(true);

    const resultGuideWithAliases = validatePlaybook({
      ...baseValidPlaybook,
      kind: 'channel-guide',
      aliases: ['Alias 1'],
    });
    expect(resultGuideWithAliases.valid).toBe(false);
    expect(resultGuideWithAliases.errors.some((e) => e.message.includes('Channel guides cannot carry service aliases'))).toBe(true);

    const resultInvalidKind = validatePlaybook({
      ...baseValidPlaybook,
      kind: 'invalid-kind' as any,
    });
    expect(resultInvalidKind.valid).toBe(false);
    expect(resultInvalidKind.errors.some((e) => e.path === 'kind')).toBe(true);
  });

  it('validates outcome field (cancel, downgrade, close-account)', () => {
    for (const outcome of ['cancel', 'downgrade', 'close-account'] as const) {
      const res = validatePlaybook({
        ...baseValidPlaybook,
        outcome,
      });
      expect(res.valid).toBe(true);
    }

    const resInvalid = validatePlaybook({
      ...baseValidPlaybook,
      outcome: 'delete-everything' as any,
    });
    expect(resInvalid.valid).toBe(false);
    expect(resInvalid.errors.some((e) => e.path === 'outcome')).toBe(true);
  });

  it('validates source sha256 checksum format', () => {
    const resValid = validatePlaybook({
      ...baseValidPlaybook,
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-10-31',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ],
    });
    expect(resValid.valid).toBe(true);

    const resInvalid = validatePlaybook({
      ...baseValidPlaybook,
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-10-31',
          sha256: 'invalid-short-hash',
        },
      ],
    });
    expect(resInvalid.valid).toBe(false);
    expect(resInvalid.errors.some((e) => e.path === 'sources[0].sha256')).toBe(true);
  });

  it('requires sha256 and accessed_on fetch date before leaving draft status', () => {
    const resDraftWithoutSha = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-10-31',
        },
      ],
    });
    // Draft playbooks are allowed to omit sha256
    expect(resDraftWithoutSha.valid).toBe(true);

    const resActiveWithoutSha = validatePlaybook({
      ...baseValidPlaybook,
      status: 'active',
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-10-31',
        },
      ],
    });
    // Active playbooks MUST have sha256
    expect(resActiveWithoutSha.valid).toBe(false);
    expect(
      resActiveWithoutSha.errors.some((e) =>
        e.message.includes('A playbook cannot leave draft status without a valid 64-character hex sha256'),
      ),
    ).toBe(true);
  });

  it('accepts allowlisted official help hosts in source validation', () => {
    const resGoogleHelp = validatePlaybook({
      ...baseValidPlaybook,
      website: 'https://youtube.com',
      sources: [
        {
          url: 'https://support.google.com/youtube/answer/6308278',
          accessed_on: '2026-10-31',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ],
      channels: [
        {
          channel: 'direct',
          source: 'https://support.google.com/youtube/answer/6308278',
          steps: ['Go to account and cancel.'],
        },
      ],
    });
    expect(resGoogleHelp.valid).toBe(true);
  });

  it('validates channel source constraints: required for active, warns for draft, must match sources', () => {
    // 1. Channel with steps carrying valid source matching one of sources
    const validWithSource = validatePlaybook({
      ...baseValidPlaybook,
      channels: [
        {
          channel: 'direct',
          source: 'https://testservice.com/cancel',
          steps: ['Log in and click cancel.'],
        },
      ],
    });
    expect(validWithSource.valid).toBe(true);
    expect(validWithSource.errors).toHaveLength(0);
    expect(validWithSource.warnings).toHaveLength(0);

    // 2. Draft channel with steps lacking source emits a warning
    const draftWithoutSource = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      channels: [
        {
          channel: 'direct',
          steps: ['Log in and click cancel.'],
        },
      ],
    });
    expect(draftWithoutSource.valid).toBe(true);
    expect(draftWithoutSource.warnings.some((w) => w.path === 'channels[0].source')).toBe(true);

    // 3. Active channel with steps lacking source emits an error (cannot become active)
    const activeWithoutSource = validatePlaybook({
      ...baseValidPlaybook,
      status: 'active',
      channels: [
        {
          channel: 'direct',
          steps: ['Log in and click cancel.'],
        },
      ],
    });
    expect(activeWithoutSource.valid).toBe(false);
    expect(activeWithoutSource.errors.some((e) => e.path === 'channels[0].source')).toBe(true);

    // 4. Channel source pointing to a URL not in sources emits an error
    const mismatchedSource = validatePlaybook({
      ...baseValidPlaybook,
      channels: [
        {
          channel: 'direct',
          source: 'https://someothersite.com/cancel-steps',
          steps: ['Log in and click cancel.'],
        },
      ],
    });
    expect(mismatchedSource.valid).toBe(false);
    expect(
      mismatchedSource.errors.some(
        (e) => e.path === 'channels[0].source' && e.message.includes('must point to one of the playbook\'s sources'),
      ),
    ).toBe(true);

    // 5. Channel without steps (empty steps with notes) does not require source
    const emptyStepsBranch = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      channels: [
        {
          channel: 'direct',
          source: 'https://testservice.com/cancel',
          steps: ['Log in and click cancel.'],
        },
        {
          channel: 'apple',
          steps: [],
          notes: 'Cancelled through Apple settings.',
        },
      ],
    });
    expect(emptyStepsBranch.valid).toBe(true);
    expect(emptyStepsBranch.warnings.filter((w) => w.path === 'channels[1].source')).toHaveLength(0);
  });
});
