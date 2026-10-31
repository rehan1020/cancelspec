// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
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

  it('WP4 Acceptance: New playbook scaffold passes lint in one command', () => {
    const { filePath } = scaffoldPlaybook(tempDir, 'GLOBAL', 'example-service', {
      name: 'Example Service',
    });

    expect(existsSync(filePath)).toBe(true);

    const lintResult = lintFiles([filePath], { quiet: true });
    expect(lintResult.passed).toBe(true);
    expect(lintResult.errorCount).toBe(0);
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

  it('buildDataBundle builds valid json files', () => {
    const outDir = join(tempDir, 'bundle-out');
    const result = buildDataBundle(playbooksDir, {
      outDir,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
    });

    expect(result.count).toBeGreaterThanOrEqual(10);
    expect(existsSync(result.latestPath)).toBe(true);
    expect(existsSync(result.versionedPath)).toBe(true);
  });

  it('runReleaseCheck runs all check gates', () => {
    const result = runReleaseCheck(playbooksDir, {
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
    });

    expect(result.checks.length).toBe(4);
    // Reference playbooks in playbooks/ are active and verified on 2026-10-31, so all checks pass
    expect(result.passed).toBe(true);
  });
});
