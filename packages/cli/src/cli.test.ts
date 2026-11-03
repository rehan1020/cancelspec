// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildDataBundle,
  lintAllPlaybooks,
  lintFiles,
  runReleaseCheck,
  scaffoldPlaybook,
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
});
