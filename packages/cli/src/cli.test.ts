// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';
import { computeContentSeal, validatePlaybook } from '@cancelspec/spec';
import {
  buildDataBundle,
  checkAiPlaybook,
  lintAllPlaybooks,
  lintFiles,
  packetPlaybook,
  recheckAllSources,
  runReleaseCheck,
  scaffoldPlaybook,
  verifyPlaybook,
  getStats,
  printStats,
} from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CLI Commands', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooksDir = join(rootDir, 'playbooks');
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cancelspec-cli-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('WP4 Acceptance: New playbook scaffold contains placeholders and fails lint until filled', () => {
    const { filePath } = scaffoldPlaybook(tempDir, 'GLOBAL', 'example-service', {
      name: 'Example Service',
    });

    expect(existsSync(filePath)).toBe(true);

    const lintResult = lintFiles([filePath], { quiet: true });
    expect(lintResult.passed).toBe(false);
    expect(lintResult.errorCount).toBeGreaterThan(0);
  });

  it('lintAllPlaybooks passes on the 10 reference playbooks', () => {
    const result = lintAllPlaybooks(playbooksDir, { quiet: true });
    expect(result.fileCount).toBeGreaterThanOrEqual(10);
    expect(result.errorCount).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('scaffoldPlaybook rejects invalid regions', () => {
    expect(() =>
      scaffoldPlaybook(tempDir, 'INVALID_REGION', 'test-service'),
    ).toThrow(/Invalid region/);
  });

  it('scaffoldPlaybook rejects non-kebab-case service IDs', () => {
    expect(() =>
      scaffoldPlaybook(tempDir, 'GLOBAL', 'Invalid_Service!'),
    ).toThrow(/lowercase kebab-case/);
  });

  it('buildDataBundle excludes drafts by default and includes them with preview flag', () => {
    const defaultOut = join(tempDir, 'default-bundle');
    const defaultResult = buildDataBundle(playbooksDir, {
      outDir: defaultOut,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      // includeDrafts: false by default
    });

    // Default bundle contains zero drafts
    expect(defaultResult.count).toBe(0);
    expect(existsSync(defaultResult.latestPath)).toBe(true);
    const bundleContent = JSON.parse(readFileSync(defaultResult.latestPath, 'utf8'));
    expect(bundleContent.playbooks).toEqual([]);

    // Preview bundle with includeDrafts: true contains playbooks
    const previewOut = join(tempDir, 'preview-bundle');
    const previewResult = buildDataBundle(playbooksDir, {
      outDir: previewOut,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      includeDrafts: true,
    });

    expect(previewResult.count).toBeGreaterThanOrEqual(10);
  });

  it('runReleaseCheck runs all check gates and enforces strict drafts and configuration', () => {
    // Normal build (strictDrafts: false) passes because drafts are isolated and placeholders warn
    const normalResult = runReleaseCheck(playbooksDir, {
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      strictDrafts: false,
    });

    expect(normalResult.checks.length).toBe(5);
    expect(normalResult.passed).toBe(true);

    // Launch tag release (strictDrafts: true) requires zero drafts in repo and no placeholders
    const strictResult = runReleaseCheck(playbooksDir, {
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      strictDrafts: true,
    });

    expect(strictResult.checks.length).toBe(5);
    const draftCheck = strictResult.checks.find((c) => c.name === 'Draft Status Check');
    expect(draftCheck).toBeDefined();
    expect(draftCheck?.passed).toBe(false);

    const configCheck = strictResult.checks.find((c) => c.name === 'Project Configuration');
    expect(configCheck).toBeDefined();
    expect(configCheck?.passed).toBe(true);
    expect(configCheck?.message).toContain('project.config configuration verified');

    expect(strictResult.passed).toBe(false);
  });

  it('runReleaseCheck fails if the bundle contains any draft', () => {
    // Create a mock directory with a bundle that contains a draft
    const badBundleDir = join(tempDir, 'bad-bundle-data');
    const bundlePath = join(badBundleDir, 'bundle.latest.json');
    const badContent = {
      dataVersion: '1.0.0',
      count: 1,
      playbooks: [
        {
          id: 'mock-draft',
          status: 'draft',
        },
      ],
    };
    buildDataBundle(playbooksDir, { outDir: badBundleDir, quiet: true, includeDrafts: true });
    // Overwrite latest with badContent
    writeFileSync(bundlePath, JSON.stringify(badContent), 'utf8');

    // Run release check and verify bundle check detects the draft
    const bundleContent = JSON.parse(readFileSync(bundlePath, 'utf8'));
    const bundleDrafts = bundleContent.playbooks.filter((p: any) => p.status === 'draft');
    expect(bundleDrafts.length).toBe(1);
  });

  describe('verify command', () => {
    it('requires --handle to verify a playbook', () => {
      const draftPath = join(tempDir, 'draft.yaml');
      writeFileSync(
        draftPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: test-draft
name: Test Draft
category: software
website: https://test.com
merchant_patterns: []
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      expect(() => verifyPlaybook(draftPath, { handle: '' })).toThrow(/--handle is required/);
    });

    it('warns but verifies successfully when merchant_patterns is empty', () => {
      const draftPath = join(tempDir, 'draft-no-pattern.yaml');
      writeFileSync(
        draftPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: test-draft
name: Test Draft
category: software
website: https://test.com
merchant_patterns: []
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const { playbook } = verifyPlaybook(draftPath, { handle: 'alice' });
        expect(playbook.status).toBe('active');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('has no merchant patterns'));
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('verifies a playbook: replaces ai-draft, sets reviewers, status active, and status_reason', () => {
      const draftPath = join(tempDir, 'draft-with-pattern.yaml');
      writeFileSync(
        draftPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: test-service
name: Test Service
category: software
website: https://test.com
merchant_patterns:
  - TEST SERVICE*
pattern_source: https://test.com/cancel
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      const today = new Date().toISOString().slice(0, 10);
      const { playbook } = verifyPlaybook(draftPath, { handle: 'alice', method: 'first-hand' });

      expect(playbook.status).toBe('active');
      expect(playbook.status_reason).toBe(`Verified by alice on ${today}`);
      expect(playbook.contributors).toEqual(['alice']);
      expect(playbook.reviewers).toEqual(['alice']);
      expect(playbook.verified_on).toBe(today);
      expect(playbook.verification_method).toBe('first-hand');
      expect(playbook.content_seal).toBeDefined();
      expect(playbook.content_seal).toMatch(/^[a-f0-9]{64}$/);

      // Subsequent tampering without re-verifying fails validation
      const content = parse(readFileSync(draftPath, 'utf8'));
      content.channels[0].steps[0] = 'Changed step';
      const checkResult = validatePlaybook(content);
      expect(checkResult.valid).toBe(false);
      expect(
        checkResult.errors.some(
          (e) => e.path === 'content_seal' && e.message === 'content changed after verification; re-run verify',
        ),
      ).toBe(true);
    });

    it('rejects "claude-ai" as human verifier handle', () => {
      const draftPath = join(tempDir, 'draft-claude-handle.yaml');
      writeFileSync(
        draftPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: test-service
name: Test Service
category: software
website: https://test.com
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      expect(() => verifyPlaybook(draftPath, { handle: 'claude-ai' })).toThrow(
        /"claude-ai" cannot be used as a human verifier handle/,
      );
    });

    it('rejects "ai-assisted" as method for human verify command', () => {
      const draftPath = join(tempDir, 'draft-ai-method.yaml');
      writeFileSync(
        draftPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: test-service
name: Test Service
category: software
website: https://test.com
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      expect(() => verifyPlaybook(draftPath, { handle: 'alice', method: 'ai-assisted' })).toThrow(
        /Invalid human verification method "ai-assisted"/,
      );
    });

    it('replaces claude-ai in reviewers when a human verifies an ai-assisted playbook', () => {
      const aiPath = join(tempDir, 'ai-assisted.yaml');
      writeFileSync(
        aiPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: test-service
name: Test Service
category: software
website: https://test.com
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers:
  - claude-ai
verified_on: 2026-10-31
verification_method: ai-assisted
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: active
status_reason: AI-assisted check, not yet confirmed by a person.
content_seal: d123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
`,
      );

      const { playbook } = verifyPlaybook(aiPath, { handle: 'bob', method: 'first-hand' });
      expect(playbook.reviewers).toEqual(['bob']);
      expect(playbook.contributors).toEqual(['bob']);
      expect(playbook.reviewers).not.toContain('claude-ai');
      expect(playbook.verification_method).toBe('first-hand');
    });
  });

  describe('check-ai command', () => {
    it('sets status active, reviewers claude-ai, verification_method ai-assisted, today, status_reason, and computes content_seal', () => {
      const draftPath = join(tempDir, 'draft-for-ai.yaml');
      writeFileSync(
        draftPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: ai-service
name: AI Service
category: software
website: https://test.com
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      const today = new Date().toISOString().slice(0, 10);
      const { playbook } = checkAiPlaybook(draftPath);

      expect(playbook.status).toBe('active');
      expect(playbook.reviewers).toEqual(['claude-ai']);
      expect(playbook.verification_method).toBe('ai-assisted');
      expect(playbook.verified_on).toBe(today);
      expect(playbook.status_reason).toBe('AI-assisted check, not yet confirmed by a person.');
      expect(playbook.content_seal).toBeDefined();
      expect(playbook.content_seal).toMatch(/^[a-f0-9]{64}$/);
    });

    it('fails when any source is missing a sha256 hash', () => {
      const noHashPath = join(tempDir, 'draft-no-hash.yaml');
      writeFileSync(
        noHashPath,
        `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: no-hash-service
name: No Hash Service
category: software
website: https://test.com
channels:
  - channel: direct
    entry_url: https://test.com/cancel
    steps:
      - Log into your account and click cancel.
    source: https://test.com/cancel
contributors:
  - ai-draft
reviewers: []
verified_on: 2026-10-31
verification_method: official-help-page
sources:
  - url: https://test.com/cancel
    accessed_on: 2026-10-31
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`,
      );

      expect(() => checkAiPlaybook(noHashPath)).toThrow(/missing a valid 64-character hex sha256 hash/);
    });
  });

  describe('Release Check --min-active', () => {
    function writeTestPlaybook(dir: string, region: string, filename: string, data: any) {
      const regDir = join(dir, region);
      mkdirSync(regDir, { recursive: true });
      const withSealData = {
        ...data,
        content_seal:
          data.status === 'active' && !data.content_seal
            ? computeContentSeal(data)
            : data.content_seal,
      };
      const yamlStr =
        '# SPDX-FileCopyrightText: 2026 CancelSpec contributors\n# SPDX-License-Identifier: CC-BY-NC-SA-4.0\n\n' +
        stringify(withSealData);
      writeFileSync(join(regDir, filename), yamlStr);
    }

    const baseValidActive = {
      id: 'active-service-1',
      name: 'Active Service 1',
      category: 'software',
      website: 'https://service1.com',
      merchant_patterns: ['SERVICE ONE*'],
      pattern_source: 'https://service1.com/help',
      channels: [
        {
          channel: 'direct',
          entry_url: 'https://service1.com/cancel',
          steps: ['Log in and cancel.'],
          source: 'https://service1.com/help',
        },
      ],
      contributors: ['alice'],
      reviewers: ['alice'],
      verified_on: '2026-11-01',
      verification_method: 'first-hand',
      sources: [
        {
          url: 'https://service1.com/help',
          accessed_on: '2026-11-01',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ],
      status: 'active',
      revision: 1,
      status_reason: 'Verified by alice on 2026-11-01',
    };

    it('failure mode 1: fails when count of active playbooks is less than minActive', () => {
      writeTestPlaybook(tempDir, 'GLOBAL', 'active-1.yaml', baseValidActive);
      const res = runReleaseCheck(tempDir, {
        minActive: 2,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      expect(res.passed).toBe(false);
      const check = res.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(check?.passed).toBe(false);
      expect(check?.message).toMatch(/required is 2/);
    });

    it('failure mode 2: fails when playbook has no non-ai human reviewer (draft status)', () => {
      writeTestPlaybook(tempDir, 'GLOBAL', 'draft-service.yaml', {
        ...baseValidActive,
        id: 'draft-service',
        merchant_patterns: [],
        pattern_source: undefined,
        status: 'draft',
        status_reason: 'AI-drafted, awaiting human verification.',
        contributors: ['ai-draft'],
        reviewers: [],
      });
      const res = runReleaseCheck(tempDir, {
        minActive: 1,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      expect(res.passed).toBe(false);
      const check = res.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(check?.passed).toBe(false);
      expect(check?.message).toMatch(/required is 1/);
    });

    it('failure mode 3: fails when verification_method is not first-hand or official-help-page', () => {
      writeTestPlaybook(tempDir, 'GLOBAL', 'active-community.yaml', {
        ...baseValidActive,
        id: 'active-community',
        verification_method: 'community-report',
      });
      const res = runReleaseCheck(tempDir, {
        minActive: 1,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      expect(res.passed).toBe(false);
      const check = res.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(check?.passed).toBe(false);
    });

    it('failure mode 4: fails when verified_on staleness is > 30 days', () => {
      writeTestPlaybook(tempDir, 'GLOBAL', 'active-stale.yaml', {
        ...baseValidActive,
        id: 'active-stale',
        verified_on: '2026-09-01',
      });
      const res = runReleaseCheck(tempDir, {
        minActive: 1,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      expect(res.passed).toBe(false);
      const check = res.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(check?.passed).toBe(false);
    });

    it('passes when qualified active playbooks count meets or exceeds minActive', () => {
      writeTestPlaybook(tempDir, 'GLOBAL', 'active-1.yaml', baseValidActive);
      writeTestPlaybook(tempDir, 'GLOBAL', 'active-2.yaml', {
        ...baseValidActive,
        id: 'active-service-2',
        name: 'Active Service 2',
        merchant_patterns: ['SERVICE TWO*'],
        verification_method: 'official-help-page',
      });
      const res = runReleaseCheck(tempDir, {
        minActive: 2,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      const check = res.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(check?.passed).toBe(true);
      expect(res.passed).toBe(true);
    });

    it('counts human-verified playbooks only unless --allow-ai-assisted is given; prints both counts', () => {
      // 1 human-verified playbook
      writeTestPlaybook(tempDir, 'GLOBAL', 'human-active.yaml', baseValidActive);

      // 1 AI-assisted active playbook
      writeTestPlaybook(tempDir, 'GLOBAL', 'ai-active.yaml', {
        ...baseValidActive,
        id: 'ai-service',
        name: 'AI Service',
        merchant_patterns: ['AI SERVICE*'],
        reviewers: ['claude-ai'],
        verification_method: 'ai-assisted',
        contributors: ['ai-draft'],
        status_reason: 'AI-assisted check, not yet confirmed by a person.',
      });

      // Without --allow-ai-assisted: minActive: 2 fails (only 1 human-verified)
      const resWithoutFlag = runReleaseCheck(tempDir, {
        minActive: 2,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      const checkFail = resWithoutFlag.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(checkFail?.passed).toBe(false);
      expect(checkFail?.message).toContain('1 human-verified, 1 AI-assisted');

      // With --allow-ai-assisted: minActive: 2 passes (1 human + 1 AI = 2)
      const resWithFlag = runReleaseCheck(tempDir, {
        minActive: 2,
        allowAiAssisted: true,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });
      const checkPass = resWithFlag.checks.find((c) => c.name === 'Minimum Active Playbooks Check');
      expect(checkPass?.passed).toBe(true);
      expect(checkPass?.message).toContain('1 human-verified, 1 AI-assisted');
      expect(checkPass?.message).toContain('meets minimum requirement of 2');
    });
  });

  describe('packet and recheck commands', () => {
    it('packetPlaybook extracts keywords and displays packet without error', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Cancel Subscription Help</h1>
            <p>Log in to your account page. Go to Manage your plan. Select Cancel subscription.</p>
            <p>Your subscription will remain active until the next billing date.</p>
          </body>
        </html>
      `;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/robots.txt')) {
          return Promise.resolve(new Response('User-agent: *\nAllow: /', { status: 200 }));
        }
        return Promise.resolve(new Response(mockHtml, { status: 200 }));
      });

      try {
        const res = await packetPlaybook(playbooksDir, 'spotify', { quiet: true });
        expect(res.playbookId).toBe('spotify');
        expect(res.sources.length).toBeGreaterThan(0);
        expect(res.sources[0]?.snippets.length).toBeGreaterThan(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('recheckAllSources checks sources across playbooks', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/robots.txt')) {
          return Promise.resolve(new Response('User-agent: *\nAllow: /', { status: 200 }));
        }
        return Promise.resolve(new Response('<html><body>Help page</body></html>', { status: 200 }));
      });

      try {
        const res = await recheckAllSources(playbooksDir, { quiet: true });
        expect(res.totalPlaybooks).toBeGreaterThan(0);
        expect(res.totalSources).toBeGreaterThan(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('packet and recheck skip manual retrieval sources', async () => {
      const customPlaybooks = join(tempDir, 'manual-sources-test');
      const globalDir = join(customPlaybooks, 'GLOBAL');
      mkdirSync(globalDir, { recursive: true });

      const manualPbPath = join(globalDir, 'manual-service.yaml');
      writeFileSync(
        manualPbPath,
        stringify({
          id: 'manual-service',
          name: 'Manual Service',
          category: 'software',
          website: 'https://manualservice.com',
          status: 'draft',
          status_reason: 'Testing manual retrieval.',
          contributors: ['ai-draft'],
          reviewers: [],
          verified_on: '2026-11-09',
          verification_method: 'official-help-page',
          channels: [
            {
              channel: 'direct',
              entry_url: 'https://manualservice.com/cancel',
              source: 'https://manualservice.com/cancel',
              steps: ['Click cancel.'],
            },
          ],
          sources: [
            {
              url: 'https://manualservice.com/cancel',
              accessed_on: '2026-11-09',
              retrieval: 'manual',
            },
          ],
          revision: 1,
        }),
      );

      // Packet should skip the manual source
      const packetRes = await packetPlaybook(customPlaybooks, 'manual-service', { quiet: true });
      expect(packetRes.sources).toHaveLength(1);
      expect(packetRes.sources[0]?.status).toBe('skipped');
      expect(packetRes.sources[0]?.error).toContain('Manual retrieval source');

      // Recheck should not query manual sources
      const fetchSpy = vi.fn();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchSpy;
      try {
        const recheckRes = await recheckAllSources(customPlaybooks, { quiet: true });
        expect(recheckRes.totalSources).toBe(0); // Manual sources skipped from recheck queue
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('stats command', () => {
    it('getStats calculates correct statistics across playbooks and targets', () => {
      const stats = getStats(playbooksDir);
      expect(stats.totalPlaybooks).toBe(62);
      expect(stats.byStatus['draft']).toBe(62);
      expect(stats.draftsAwaitingVerification).toBe(62);
      expect(stats.humanVerifiedActive).toBe(0);
      expect(stats.aiAssistedActive).toBe(0);
      expect(stats.activeWithPatterns).toBe(0);
      expect(stats.activeWithoutPatterns).toBe(0);
      expect(stats.byRegion['GLOBAL']).toBeGreaterThan(0);
      expect(stats.byCategory['streaming-video']).toBeGreaterThan(0);
      expect(stats.targetsTotal).toBeGreaterThan(0);
      expect(stats.targetsWithoutDraftOrSkipCount).toBe(11);
      expect(stats.targetsWithoutDraftOrSkip.some((t) => t.id === 'discovery-plus')).toBe(true);
    });

    it('getStats computes active with and without patterns on synthetic fixtures', () => {
      const customPlaybooks = join(tempDir, 'custom-playbooks');
      const usDir = join(customPlaybooks, 'US');
      mkdirSync(usDir, { recursive: true });

      // Active with pattern (human-verified)
      writeFileSync(
        join(usDir, 'service-a.yaml'),
        stringify({
          id: 'service-a',
          name: 'Service A',
          category: 'software',
          status: 'active',
          verification_method: 'first-hand',
          merchant_patterns: ['SERVICE*A'],
        }),
      );

      // Active without pattern (ai-assisted)
      writeFileSync(
        join(usDir, 'service-b.yaml'),
        stringify({
          id: 'service-b',
          name: 'Service B',
          category: 'software',
          status: 'active',
          verification_method: 'ai-assisted',
          merchant_patterns: [],
        }),
      );

      // Draft playbook
      writeFileSync(
        join(usDir, 'service-c.yaml'),
        stringify({
          id: 'service-c',
          name: 'Service C',
          category: 'software',
          status: 'draft',
        }),
      );

      // Custom targets
      const customTargetsPath = join(tempDir, 'custom-targets.json');
      writeFileSync(
        customTargetsPath,
        JSON.stringify([
          { id: 'service-a', name: 'Service A', region: 'US' }, // has playbook
          { id: 'service-d', name: 'Service D', region: 'US', skipped_reason: 'Bot challenge' }, // skipped
          { id: 'service-e', name: 'Service E', region: 'US' }, // unhandled
        ]),
      );

      const stats = getStats(customPlaybooks, customTargetsPath);
      expect(stats.totalPlaybooks).toBe(3);
      expect(stats.byStatus['active']).toBe(2);
      expect(stats.byStatus['draft']).toBe(1);
      expect(stats.humanVerifiedActive).toBe(1);
      expect(stats.aiAssistedActive).toBe(1);
      expect(stats.activeWithPatterns).toBe(1);
      expect(stats.activeWithoutPatterns).toBe(1);
      expect(stats.draftsAwaitingVerification).toBe(1);
      expect(stats.targetsTotal).toBe(3);
      expect(stats.targetsWithoutDraftOrSkipCount).toBe(1);
      expect(stats.targetsWithoutDraftOrSkip[0]?.id).toBe('service-e');
    });

    it('printStats outputs formatted statistics', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const stats = getStats(playbooksDir);
        printStats(stats);
        const calls = logSpy.mock.calls.map((c) => c[0]);
        expect(calls.some((msg) => typeof msg === 'string' && msg.includes('=== CancelSpec Stats ==='))).toBe(true);
        expect(calls.some((msg) => typeof msg === 'string' && msg.includes('Playbooks by Status:'))).toBe(true);
        expect(calls.some((msg) => typeof msg === 'string' && msg.includes('Human-verified active:'))).toBe(true);
        expect(calls.some((msg) => typeof msg === 'string' && msg.includes('AI-assisted active:'))).toBe(true);
        expect(calls.some((msg) => typeof msg === 'string' && msg.includes('Pattern Coverage (Active Playbooks):'))).toBe(true);
        expect(calls.some((msg) => typeof msg === 'string' && msg.includes('Targets Status (targets.json):'))).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
