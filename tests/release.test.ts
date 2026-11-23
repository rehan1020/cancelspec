// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { runReleaseDryRun } from '../scripts/release-dry-run.js';
import { runReleaseCheck } from '../packages/cli/src/index.js';
import { computeContentSeal } from '../packages/spec/src/seal.js';

describe('Release Pipeline & Dry-Run (WP12)', () => {
  const rootDir = process.cwd();
  const dataDistDir = join(rootDir, 'dist/data');

  it('runs release dry-run successfully', () => {
    const success = runReleaseDryRun({ quiet: true });
    expect(success).toBe(true);

    const latestPath = join(dataDistDir, 'bundle.latest.json');
    const sumsPath = join(dataDistDir, 'SHA256SUMS.txt');
    const sbomPath = join(rootDir, 'dist/sbom.json');

    expect(existsSync(latestPath)).toBe(true);
    expect(existsSync(sumsPath)).toBe(true);
    expect(existsSync(sbomPath)).toBe(true);

    // Verify SHA-256 checksums file matches actual file hash
    const latestBuf = readFileSync(latestPath);
    const actualHash = createHash('sha256').update(latestBuf).digest('hex');
    const sumsText = readFileSync(sumsPath, 'utf8');

    expect(sumsText).toContain(actualHash);

    // Verify CycloneDX SBOM content
    const sbomJson = JSON.parse(readFileSync(sbomPath, 'utf8'));
    expect(sbomJson.bomFormat).toBe('CycloneDX');
    expect(sbomJson.components.length).toBeGreaterThan(0);
  }, 15000);

  it('tag-style release-check with --min-active 40 fails with fewer than 40 qualifying playbooks and passes with 40 or more (use fixtures)', () => {
    const fixturesPlaybooksDir = join(rootDir, 'fixtures/playbooks');

    // 1. With existing fixtures (17 qualifying playbooks), --min-active 40 fails
    const failResult = runReleaseCheck(fixturesPlaybooksDir, {
      minActive: 40,
      referenceDate: new Date('2026-11-10T00:00:00.000Z'),
      quiet: true,
    });
    expect(failResult.passed).toBe(false);
    const minActiveCheckFail = failResult.checks.find(
      (c) => c.name === 'Minimum Active Playbooks Check',
    );
    expect(minActiveCheckFail).toBeDefined();
    expect(minActiveCheckFail?.passed).toBe(false);
    expect(minActiveCheckFail?.message).toContain('required is 40');

    // 2. With 40 or more qualifying playbooks (using fixtures), --min-active 40 passes
    const tempFixturesDir = mkdtempSync(join(tmpdir(), 'cancelspec-release-fixtures-'));
    try {
      const globalDir = join(tempFixturesDir, 'GLOBAL');
      mkdirSync(globalDir, { recursive: true });

      // Generate 40 qualifying fixture playbooks
      for (let i = 1; i <= 40; i++) {
        const fixturePlaybook = {
          id: `fixture-service-${i}`,
          name: `Fixture Service ${i}`,
          category: 'software',
          website: `https://fixture${i}.net`,
          merchant_patterns: [`FIXTURE SERVICE ${i}*`],
          pattern_source: `https://fixture${i}.net/help`,
          channels: [
            {
              channel: 'direct',
              entry_url: `https://fixture${i}.net/cancel`,
              steps: ['Log in and cancel.'],
              source: `https://fixture${i}.net/help`,
            },
          ],
          contributors: ['test-fixture'],
          reviewers: ['test-fixture'],
          verified_on: '2026-11-01',
          verification_method: 'first-hand',
          sources: [
            {
              url: `https://fixture${i}.net/help`,
              accessed_on: '2026-11-01',
              sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
          revision: 1,
          status: 'active',
          status_reason: 'Test fixture playbook',
        };
        (fixturePlaybook as any).content_seal = computeContentSeal(fixturePlaybook);

        const content =
          '# SPDX-FileCopyrightText: 2026 CancelSpec contributors\n# SPDX-License-Identifier: CC-BY-NC-SA-4.0\n\n' +
          stringify(fixturePlaybook);
        writeFileSync(join(globalDir, `fixture-service-${i}.yaml`), content, 'utf8');
      }

      const passResult = runReleaseCheck(tempFixturesDir, {
        minActive: 40,
        referenceDate: new Date('2026-11-10T00:00:00.000Z'),
        quiet: true,
      });

      expect(passResult.passed).toBe(true);
      const minActiveCheckPass = passResult.checks.find(
        (c) => c.name === 'Minimum Active Playbooks Check',
      );
      expect(minActiveCheckPass).toBeDefined();
      expect(minActiveCheckPass?.passed).toBe(true);
      expect(minActiveCheckPass?.message).toContain('meets minimum requirement of 40');
    } finally {
      rmSync(tempFixturesDir, { recursive: true, force: true });
    }
  });
});
