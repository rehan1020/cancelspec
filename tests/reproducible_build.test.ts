// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildSite } from '@cancelspec/site-builder';

describe('Reproducible Builds Gate (WP9)', () => {
  const rootDir = process.cwd();
  const playbooksDir = join(rootDir, 'playbooks');
  const dirA = join(rootDir, 'dist/test-repro-a');
  const dirB = join(rootDir, 'dist/test-repro-b');

  const refDate = new Date('2026-10-31T00:00:00.000Z');

  afterAll(() => {
    try {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  function getFileHashes(dir: string, baseDir: string = dir): Map<string, string> {
    const map = new Map<string, string>();

    for (const item of readdirSync(dir)) {
      const fullPath = join(dir, item);
      const relPath = fullPath.slice(baseDir.length).replace(/^[\\/]+/, '').replace(/\\/g, '/');

      if (statSync(fullPath).isDirectory()) {
        const sub = getFileHashes(fullPath, baseDir);
        for (const [k, v] of sub) {
          map.set(k, v);
        }
      } else {
        const buf = readFileSync(fullPath);
        const hash = createHash('sha256').update(buf).digest('hex');
        map.set(relPath, hash);
      }
    }

    return map;
  }

  it('WP9 Acceptance: building twice yields 100% bit-identical files and hashes', () => {
    // Build Run A
    buildSite({
      playbooksDir,
      outDir: dirA,
      quiet: true,
      referenceDate: refDate,
    });

    // Build Run B
    buildSite({
      playbooksDir,
      outDir: dirB,
      quiet: true,
      referenceDate: refDate,
    });

    const hashesA = getFileHashes(dirA);
    const hashesB = getFileHashes(dirB);

    expect(hashesA.size).toBeGreaterThan(25);
    expect(hashesA.size).toBe(hashesB.size);

    for (const [relPath, hashA] of hashesA) {
      const hashB = hashesB.get(relPath);
      expect(hashB, `File missing in Run B: ${relPath}`).toBeDefined();
      expect(hashA, `Hash mismatch in ${relPath}`).toBe(hashB);
    }

    console.log(`✓ Reproducible build verified across ${hashesA.size} files.`);
  }, 20000);
});
