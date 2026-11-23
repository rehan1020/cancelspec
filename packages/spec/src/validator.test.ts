// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SPEC_VERSION } from './constants.js';
import { computeContentSeal } from './seal.js';
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
  function withSeal(pb: Record<string, unknown>) {
    return {
      ...pb,
      content_seal: computeContentSeal(pb),
    };
  }

  const rawBasePlaybook = {
    id: 'test-service',
    name: 'Test Service',
    category: 'software',
    website: 'https://testservice.com',
    merchant_patterns: ['TEST SERVICE*'],
    pattern_source: 'https://testservice.com/cancel',
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
  const baseValidPlaybook = withSeal(rawBasePlaybook);

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

    const resultValid = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        merchant_patterns: ['HULU.COM*', 'SPOTIFY*'],
      }),
    );
    expect(resultValid.valid).toBe(true);
  });

  it('validates playbook kind (service vs channel-guide) and prevents aliases on channel-guides', () => {
    const resultGuideValid = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        kind: 'channel-guide',
        aliases: undefined,
      }),
    );
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
      const res = validatePlaybook(
        withSeal({
          ...baseValidPlaybook,
          outcome,
        }),
      );
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
    const resValid = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        sources: [
          {
            url: 'https://testservice.com/cancel',
            accessed_on: '2026-10-31',
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        ],
      }),
    );
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
      merchant_patterns: [],
      pattern_source: undefined,
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
      merchant_patterns: [],
      pattern_source: undefined,
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
    const resGoogleHelp = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        website: 'https://youtube.com',
      pattern_source: 'https://support.google.com/youtube/answer/6308278',
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
          entry_url: 'https://youtube.com/account',
          source: 'https://support.google.com/youtube/answer/6308278',
          steps: ['Go to account and cancel.'],
        },
      ],
    }));
    expect(resGoogleHelp.valid).toBe(true);
  });

  it('validates channel source constraints: required for active, warns for draft, must match sources', () => {
    // 1. Channel with steps carrying valid source matching one of sources
    const validWithSource = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        channels: [
          {
            channel: 'direct',
            entry_url: 'https://testservice.com/cancel',
            source: 'https://testservice.com/cancel',
            steps: ['Log in and click cancel.'],
          },
        ],
      }),
    );
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
          entry_url: 'https://testservice.com/cancel',
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
          entry_url: 'https://testservice.com/cancel',
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
          entry_url: 'https://testservice.com/cancel',
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
          entry_url: 'https://testservice.com/cancel',
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

  it('enforces ai-draft restrictions and rules for direct channels and facts', () => {
    // 1. ai-draft cannot have friction tags
    const draftWithTags = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      merchant_patterns: [],
      tags: ['retention-offer'],
    });
    expect(draftWithTags.valid).toBe(false);
    expect(draftWithTags.errors.some((e) => e.path === 'tags' && e.message.includes('ai-draft'))).toBe(true);

    // 2. ai-draft cannot have accessible_alternative
    const draftWithAlt = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      merchant_patterns: [],
      accessible_alternative: 'Online form available',
    });
    expect(draftWithAlt.valid).toBe(false);
    expect(draftWithAlt.errors.some((e) => e.path === 'accessible_alternative' && e.message.includes('ai-draft'))).toBe(true);

    // 3. merchant_patterns require pattern_source
    const patternsWithoutSource = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      merchant_patterns: ['TEST SERVICE*'],
      pattern_source: undefined,
    });
    expect(patternsWithoutSource.valid).toBe(false);
    expect(patternsWithoutSource.errors.some((e) => e.path === 'pattern_source' && e.message.includes('required'))).toBe(true);

    // 4. valid draft with merchant_patterns and pattern_source passes
    const draftWithPatternSource = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      merchant_patterns: ['TEST SERVICE*'],
      pattern_source: 'https://testservice.com/cancel',
    });
    expect(draftWithPatternSource.valid).toBe(true);

    // 5. active playbook can have empty merchant_patterns
    const activeWithoutPatterns = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        status: 'active',
        merchant_patterns: [],
        pattern_source: undefined,
      }),
    );
    expect(activeWithoutPatterns.valid).toBe(true);

    // 6. pattern_source must match a source in sources with a sha256 hash
    const invalidPatternSource = validatePlaybook({
      ...baseValidPlaybook,
      merchant_patterns: ['TEST SERVICE*'],
      pattern_source: 'https://other-domain.com/unlisted',
    });
    expect(invalidPatternSource.valid).toBe(false);
    expect(invalidPatternSource.errors.some((e) => e.path === 'pattern_source' && e.message.includes('equal one of the URLs in sources'))).toBe(true);

    // 7. valid ai-draft with empty patterns and no tags passes
    const validDraft = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      merchant_patterns: [],
      pattern_source: undefined,
    });
    expect(validDraft.valid).toBe(true);

    // 5. direct channel with steps must have entry_url
    const directNoEntryUrl = validatePlaybook({
      ...baseValidPlaybook,
      channels: [
        {
          channel: 'direct',
          source: 'https://testservice.com/cancel',
          steps: ['Log in and click cancel.'],
        },
      ],
    });
    expect(directNoEntryUrl.valid).toBe(false);
    expect(directNoEntryUrl.errors.some((e) => e.path === 'channels[0].entry_url' && e.message.includes('required'))).toBe(true);

    // 6. Fact source must equal a URL in sources
    const factWrongSource = validatePlaybook({
      ...baseValidPlaybook,
      notice_period: {
        value: '30 days',
        source: 'https://otherdomain.com/terms',
        accessed_on: '2026-10-31',
      },
    });
    expect(factWrongSource.valid).toBe(false);
    expect(factWrongSource.errors.some((e) => e.path === 'notice_period.source' && e.message.includes('must point to one of the playbook\'s sources'))).toBe(true);

    // 7. Step with filler confirmation phrase emits a warning
    const fillerWarning = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        channels: [
          {
            channel: 'direct',
            entry_url: 'https://testservice.com/cancel',
            source: 'https://testservice.com/cancel',
            steps: ['Click Cancel.', 'Confirm to finish.'],
          },
        ],
      }),
    );
    expect(fillerWarning.valid).toBe(true);
    expect(fillerWarning.warnings.some((w) => w.path === 'channels[0].steps[1].action' && w.message.includes('filler confirmation phrase'))).toBe(true);
  });

  it('rejects a merchant pattern whose literal text is only a processor or brand prefix unless it contains a product word', () => {
    // Bare prefixes must be rejected
    const barePrefixes = ['GOOGLE*', 'APPLE.COM*', 'PAYPAL*', 'GOOGLE PLAY*', 'APPLE*'];
    for (const prefix of barePrefixes) {
      const res = validatePlaybook({
        ...baseValidPlaybook,
        merchant_patterns: [prefix],
        pattern_source: 'https://testservice.com/cancel',
      });
      expect(res.valid).toBe(false);
      expect(
        res.errors.some((e) => e.path === 'merchant_patterns[0]' && e.message.includes('cannot be only a processor or brand prefix')),
      ).toBe(true);
    }

    // Patterns with product words must pass
    const validWithProductWord = ['APPLE.COM/BILL*', 'GOOGLE*PLAY STORE*', 'GOOGLE*YOUTUBE PREMIUM*', 'AMAZON DIGITAL SVCS*'];
    for (const pattern of validWithProductWord) {
      const res = validatePlaybook(
        withSeal({
          ...baseValidPlaybook,
          merchant_patterns: [pattern],
          pattern_source: 'https://testservice.com/cancel',
        }),
      );
      expect(res.valid).toBe(true);
    }
  });

  it('validates source retrieval field (automated vs manual)', () => {
    // 1. Manual source in draft without sha256 is valid and emits warning
    const draftManual = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      merchant_patterns: [],
      pattern_source: undefined,
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-10-31',
          retrieval: 'manual',
        },
      ],
    });
    expect(draftManual.valid).toBe(true);
    expect(
      draftManual.warnings.some((w) =>
        w.message.includes('Source has manual retrieval; skipped by automated verification'),
      ),
    ).toBe(true);

    // 2. Invalid retrieval value is rejected
    const invalidRetrieval = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-10-31',
          retrieval: 'carrier' as any,
        },
      ],
    });
    expect(invalidRetrieval.valid).toBe(false);
    expect(
      invalidRetrieval.errors.some((e) => e.path === 'sources[0].retrieval'),
    ).toBe(true);

    // 3. Active playbook with manual source and ai-draft contributor is rejected
    const activeManualAiDraft = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        status: 'active',
        merchant_patterns: [],
        pattern_source: undefined,
        contributors: ['ai-draft', 'human-verifier'],
        reviewers: ['human-reviewer'],
        sources: [
          {
            url: 'https://testservice.com/cancel',
            accessed_on: '2026-10-31',
            retrieval: 'manual',
          },
        ],
      }),
    );
    expect(activeManualAiDraft.valid).toBe(false);
    expect(
      activeManualAiDraft.errors.some((e) =>
        e.message.includes('Manual sources cannot be used in a playbook with "ai-draft" as contributor'),
      ),
    ).toBe(true);

    // 4. Active playbook with manual source and invalid verification method is rejected
    const activeManualBadMethod = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        status: 'active',
        merchant_patterns: [],
        pattern_source: undefined,
        contributors: ['human-author'],
        reviewers: ['human-reviewer'],
        verification_method: 'community-report',
        sources: [
          {
            url: 'https://testservice.com/cancel',
            accessed_on: '2026-10-31',
            retrieval: 'manual',
          },
        ],
      }),
    );
    expect(activeManualBadMethod.valid).toBe(false);
    expect(
      activeManualBadMethod.errors.some((e) =>
        e.message.includes('Active playbooks with manual sources must use verification_method "first-hand" or "official-help-page"'),
      ),
    ).toBe(true);

    // 5. Active playbook with manual source, human reviewer, and valid method passes
    const activeManualValid = validatePlaybook(
      withSeal({
        ...baseValidPlaybook,
        status: 'active',
        merchant_patterns: [],
        pattern_source: undefined,
        contributors: ['human-author'],
        reviewers: ['human-reviewer'],
        verification_method: 'official-help-page',
        sources: [
          {
            url: 'https://testservice.com/cancel',
            accessed_on: '2026-10-31',
            retrieval: 'manual',
          },
        ],
      }),
    );
    expect(activeManualValid.valid).toBe(true);
  });

  it('validates content_seal for active playbooks and allows drafts without seal', () => {
    // 1. Draft without content_seal passes (drafts unaffected)
    const draftWithoutSeal = validatePlaybook({
      ...baseValidPlaybook,
      status: 'draft',
      contributors: ['ai-draft'],
      content_seal: undefined,
    });
    expect(draftWithoutSeal.valid).toBe(true);

    // 2. Active without content_seal is rejected with exact error message
    const activeWithoutSeal = validatePlaybook({
      ...baseValidPlaybook,
      status: 'active',
      content_seal: undefined,
    });
    expect(activeWithoutSeal.valid).toBe(false);
    expect(
      activeWithoutSeal.errors.some(
        (e) => e.path === 'content_seal' && e.message === 'content changed after verification; re-run verify',
      ),
    ).toBe(true);

    // 3. Active with mismatched content_seal is rejected with exact error message
    const activeMismatchedSeal = validatePlaybook({
      ...baseValidPlaybook,
      status: 'active',
      content_seal: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    });
    expect(activeMismatchedSeal.valid).toBe(false);
    expect(
      activeMismatchedSeal.errors.some(
        (e) => e.path === 'content_seal' && e.message === 'content changed after verification; re-run verify',
      ),
    ).toBe(true);

    // 4. Active with matching content_seal passes
    const validActivePlaybook = withSeal({ ...baseValidPlaybook });
    const activeValid = validatePlaybook(validActivePlaybook);
    expect(activeValid.valid).toBe(true);

    // 5. Modifying steps of an active verified playbook without re-running verify fails seal check
    const tamperedSteps = validatePlaybook({
      ...validActivePlaybook,
      channels: [
        {
          channel: 'direct',
          entry_url: 'https://testservice.com/cancel',
          source: 'https://testservice.com/cancel',
          steps: ['Tampered step action.'],
        },
      ],
      // content_seal remains the old seal
    });
    expect(tamperedSteps.valid).toBe(false);
    expect(
      tamperedSteps.errors.some(
        (e) => e.path === 'content_seal' && e.message === 'content changed after verification; re-run verify',
      ),
    ).toBe(true);
  });

  it('validates rules for verification_method "ai-assisted"', () => {
    const validAiPlaybook = withSeal({
      ...baseValidPlaybook,
      status: 'active',
      reviewers: ['claude-ai'],
      verification_method: 'ai-assisted',
      contributors: ['ai-draft'],
      status_reason: 'AI-assisted check, not yet confirmed by a person.',
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-11-20',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ],
    });

    // 1. Valid active ai-assisted playbook passes
    const validRes = validatePlaybook(validAiPlaybook);
    expect(validRes.valid).toBe(true);

    // 2. ai-assisted cannot have human reviewers
    const humanReviewer = withSeal({
      ...validAiPlaybook,
      reviewers: ['alice'],
    });
    const resHuman = validatePlaybook(humanReviewer);
    expect(resHuman.valid).toBe(false);
    expect(resHuman.errors.some((e) => e.message.includes('reserved handle "claude-ai"'))).toBe(true);

    const mixedReviewers = withSeal({
      ...validAiPlaybook,
      reviewers: ['claude-ai', 'alice'],
    });
    const resMixed = validatePlaybook(mixedReviewers);
    expect(resMixed.valid).toBe(false);
    expect(resMixed.errors.some((e) => e.message.includes('reserved handle "claude-ai"'))).toBe(true);

    // 3. Human-verified playbook cannot have claude-ai as reviewer
    const humanWithClaude = withSeal({
      ...baseValidPlaybook,
      verification_method: 'first-hand',
      reviewers: ['alice', 'claude-ai'],
    });
    const resHumanClaude = validatePlaybook(humanWithClaude);
    expect(resHumanClaude.valid).toBe(false);
    expect(resHumanClaude.errors.some((e) => e.message.includes('"claude-ai" cannot be a reviewer'))).toBe(true);

    // 4. Must have hashes on every source
    const noHash = withSeal({
      ...validAiPlaybook,
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-11-20',
        },
      ],
    });
    const resNoHash = validatePlaybook(noHash);
    expect(resNoHash.valid).toBe(false);
    expect(resNoHash.errors.some((e) => e.message.includes('must have hashes on every source'))).toBe(true);

    // 5. Must carry content_seal
    const missingSeal = {
      ...validAiPlaybook,
      content_seal: undefined,
    };
    const resMissingSeal = validatePlaybook(missingSeal);
    expect(resMissingSeal.valid).toBe(false);
    expect(resMissingSeal.errors.some((e) => e.message.includes('must carry content_seal'))).toBe(true);

    // 6. Active status_reason must start with "AI-assisted check, not yet confirmed by a person"
    const badReason = withSeal({
      ...validAiPlaybook,
      status_reason: 'Automated check completed.',
    });
    const resBadReason = validatePlaybook(badReason);
    expect(resBadReason.valid).toBe(false);
    expect(
      resBadReason.errors.some((e) =>
        e.message.includes('AI-assisted check, not yet confirmed by a person'),
      ),
    ).toBe(true);

    // 7. Manual sources cannot be used with ai-assisted
    const manualSource = withSeal({
      ...validAiPlaybook,
      sources: [
        {
          url: 'https://testservice.com/cancel',
          accessed_on: '2026-11-20',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          retrieval: 'manual',
        },
      ],
    });
    const resManual = validatePlaybook(manualSource);
    expect(resManual.valid).toBe(false);
    expect(
      resManual.errors.some((e) =>
        e.message.includes('Manual sources cannot be used with verification_method "ai-assisted"'),
      ),
    ).toBe(true);
  });
});
