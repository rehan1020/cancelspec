// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSite, loadProjectConfig } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Site Builder', () => {
  const rootDir = join(__dirname, '../../..');
  const playbooksDir = join(rootDir, 'playbooks');
  const config = loadProjectConfig(rootDir);
  let tempOutDir: string;

  beforeEach(() => {
    tempOutDir = mkdtempSync(join(tmpdir(), 'cancelspec-site-'));
  });

  afterEach(() => {
    try {
      rmSync(tempOutDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup
    }
  });

  it('WP5 Acceptance: builds all pages and output assets', () => {
    const report = buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
    });

    expect(report.pagesCount).toBeGreaterThanOrEqual(20);
    expect(report.urls.length).toBe(report.pagesCount);

    // Verify key pages and assets exist
    const expectedFiles = [
      'index.html',
      'tool/index.html',
      'services/index.html',
      'services/global/spotify/index.html',
      'services/global/netflix/index.html',
      'hall-of-shame/index.html',
      'methodology/index.html',
      'spec/index.html',
      'contribute/index.html',
      'changelog/index.html',
      'search/index.html',
      'policies/privacy/index.html',
      'policies/security/index.html',
      '404.html',
      'styles/main.css',
      '_headers',
      'sitemap.xml',
      'robots.txt',
      'search-index.json',
      'data/bundle.latest.json',
    ];

    for (const relFile of expectedFiles) {
      const fullPath = join(tempOutDir, relFile);
      expect(existsSync(fullPath), `Expected ${relFile} to exist`).toBe(true);
    }
  });

  it('WP5 Acceptance: service pages work fully without JavaScript (A11Y-2)', () => {
    buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
    });

    const spotifyHtml = readFileSync(
      join(tempOutDir, 'services/global/spotify/index.html'),
      'utf8',
    );

    // Verify no script tags are present on service pages
    expect(spotifyHtml).not.toContain('<script');
    expect(spotifyHtml).toContain('How to cancel Spotify (GLOBAL)');
    expect(spotifyHtml).toContain('Where do you pay?');
    expect(spotifyHtml).toContain('Log into your Spotify account page');
  });

  it('enforces page size budget (< 100 KB for service page)', () => {
    buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
    });

    const stat = statSync(join(tempOutDir, 'services/global/spotify/index.html'));
    expect(stat.size).toBeLessThan(100 * 1024); // well below 100 KB
  });

  it('embeds strict Content-Security-Policy on tool and content pages', () => {
    buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
    });

    const toolHtml = readFileSync(join(tempOutDir, 'tool/index.html'), 'utf8');
    const homeHtml = readFileSync(join(tempOutDir, 'index.html'), 'utf8');

    // Tool page must have connect-src 'none' (PRIV-4)
    expect(toolHtml).toContain("connect-src 'none'");

    // Content pages allow connect-src 'self' for search index
    expect(homeHtml).toContain("connect-src 'self'");
  });
});
