// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runReleaseDryRun } from '../scripts/release-dry-run.js';

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
});
