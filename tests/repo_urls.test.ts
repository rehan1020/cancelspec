// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (entry.name === 'package-lock.json') {
        continue;
      }
      files.push(relPath);
    }
  }

  return files;
}

describe('Repository Cleanliness & URL / Domain Consistency', () => {
  it('ensures no files contain deprecated repo references, unowned domain, or placeholders', () => {
    const rootDir = process.cwd();
    const allFiles = getAllFiles(rootDir);

    // Banned patterns per specification
    const bannedPatterns = [
      'github.com/' + 'cancelspec',
      'cancelspec' + '.org',
      'REPLACE' + '_ME',
    ];

    const allowlist = new Set([
      'tests/repo_urls.test.ts',
    ]);

    const violations: { file: string; pattern: string }[] = [];

    for (const relPath of allFiles) {
      if (allowlist.has(relPath)) {
        continue;
      }

      const fullPath = join(rootDir, relPath);
      let content = '';
      try {
        content = readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      for (const pattern of bannedPatterns) {
        if (content.includes(pattern)) {
          violations.push({ file: relPath, pattern });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
