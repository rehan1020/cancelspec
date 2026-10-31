// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sharedSiteDir = join(process.cwd(), 'dist/test-gates-site');

describe('Offline Capability Gate (WP9)', () => {
  function getAllFiles(dir: string): string[] {
    const files: string[] = [];
    for (const item of readdirSync(dir)) {
      const full = join(dir, item);
      if (statSync(full).isDirectory()) {
        files.push(...getAllFiles(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }

  it('all assets (CSS, JS, Worker) are served locally without external CDN dependencies', () => {
    const allFiles = getAllFiles(sharedSiteDir);
    const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');

      // Stylesheet links must point to /styles/ or local
      const cssLinks = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
      for (const link of cssLinks) {
        expect(link).toContain('href="/styles/main.css"');
      }

      // Script links must point to local scripts
      const scripts = html.match(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
      for (const script of scripts) {
        expect(script).toMatch(/src=["']\/scripts\//);
      }
    }
  });

  it('scanner worker has embedded index and requires 0 network connections', () => {
    const workerPath = join(sharedSiteDir, 'scripts/scanner-worker.js');
    const workerCode = readFileSync(workerPath, 'utf8');

    // Asserts worker contains embedded data and zero remote fetch
    expect(workerCode).toContain('serviceId:"spotify"');
    expect(workerCode).toContain('entries:');
    expect(workerCode).not.toContain('fetch(');
    expect(workerCode).not.toContain('XMLHttpRequest');
  });
});
