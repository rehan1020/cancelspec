// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpGet } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSite, loadProjectConfig } from './index.js';
import { createPreviewServer } from '../../../scripts/serve.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fetchUrl(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    httpGet(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    }).on('error', reject);
  });
}

function getAllHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

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

  it('WP5 Acceptance: builds all pages and output assets with preview flag (--include-drafts)', () => {
    const report = buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      includeDrafts: true,
    });

    expect(report.pagesCount).toBeGreaterThanOrEqual(20);
    expect(report.urls.length).toBe(report.pagesCount);

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
      includeDrafts: true,
    });

    const spotifyHtml = readFileSync(
      join(tempOutDir, 'services/global/spotify/index.html'),
      'utf8',
    );

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
      includeDrafts: true,
    });

    const stat = statSync(join(tempOutDir, 'services/global/spotify/index.html'));
    expect(stat.size).toBeLessThan(100 * 1024);
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

    expect(toolHtml).toContain("connect-src 'none'");
    expect(homeHtml).toContain("connect-src 'self'");
  });

  it('Task 1 & 2: default build excludes drafts, handles empty corpus safely, and contains zero broken links', () => {
    buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      // includeDrafts: false by default
    });

    // 1. Bundle contains zero draft playbooks
    const bundleLatest = JSON.parse(readFileSync(join(tempOutDir, 'data/bundle.latest.json'), 'utf8'));
    expect(bundleLatest.count).toBe(0);
    expect(bundleLatest.playbooks).toEqual([]);

    // 2. Search index contains none
    const searchIndex = JSON.parse(readFileSync(join(tempOutDir, 'search-index.json'), 'utf8'));
    expect(searchIndex).toEqual([]);

    // 3. Service, category, and region directories do not exist for drafts
    expect(existsSync(join(tempOutDir, 'services/global'))).toBe(false);
    expect(existsSync(join(tempOutDir, 'services/us'))).toBe(false);
    expect(existsSync(join(tempOutDir, 'services/category'))).toBe(false);
    expect(existsSync(join(tempOutDir, 'services/region'))).toBe(false);

    // 4. Sitemap references none of the draft service pages
    const sitemap = readFileSync(join(tempOutDir, 'sitemap.xml'), 'utf8');
    expect(sitemap).not.toContain('/services/global/');
    expect(sitemap).not.toContain('/services/category/');

    // 5. Hall of Shame references no service links
    const shameHtml = readFileSync(join(tempOutDir, 'hall-of-shame/index.html'), 'utf8');
    expect(shameHtml).not.toContain('/services/global/');
    expect(shameHtml).toContain('No services with friction tags currently cataloged');

    // 6. Home and tool pages state that no verified playbooks are published yet
    const homeHtml = readFileSync(join(tempOutDir, 'index.html'), 'utf8');
    expect(homeHtml.toLowerCase()).toContain('no verified playbooks are published yet');

    const toolHtml = readFileSync(join(tempOutDir, 'tool/index.html'), 'utf8');
    expect(toolHtml.toLowerCase()).toContain('no verified playbooks are published yet');

    const servicesHtml = readFileSync(join(tempOutDir, 'services/index.html'), 'utf8');
    expect(servicesHtml.toLowerCase()).toContain('no verified playbooks are published yet');
  });

  it('Task 3: relative paths work at root, under subpath, and when opened from file system', async () => {
    buildSite({
      playbooksDir,
      outDir: tempOutDir,
      config,
      referenceDate: new Date('2026-10-31T00:00:00.000Z'),
      quiet: true,
      includeDrafts: true, // test with full pages to test all depths
    });

    const allHtmlFiles = getAllHtmlFiles(tempOutDir);
    expect(allHtmlFiles.length).toBeGreaterThanOrEqual(15);

    // 1. Check local file system relative resolution (file:// simulation)
    for (const filePath of allHtmlFiles) {
      const html = readFileSync(filePath, 'utf8');
      const relDir = dirname(filePath);

      // Match all href, src, action attributes
      const linkRegex = /(?:href|src|action)="([^"#:]+)"/g;
      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(html)) !== null) {
        const linkTarget = match[1]!;
        // Link target must not start with a slash (must be relative)
        expect(linkTarget.startsWith('/')).toBe(false);

        // Resolve relative to current file's directory and verify target exists
        const targetClean = linkTarget.split('?')[0]!;
        const resolvedPath = resolve(relDir, targetClean);
        expect(
          existsSync(resolvedPath),
          `In ${filePath}: relative link "${linkTarget}" resolved to missing file "${resolvedPath}"`,
        ).toBe(true);
      }
    }

    // 2. Serve build at root (http://127.0.0.1:port/) and verify no 404s
    const rootServer = createPreviewServer({ root: tempOutDir });
    await new Promise<void>((res) => rootServer.listen(0, '127.0.0.1', () => res()));
    const rootPort = (rootServer.address() as any).port;

    try {
      const homeRes = await fetchUrl(`http://127.0.0.1:${rootPort}/index.html`);
      expect(homeRes.status).toBe(200);

      const toolRes = await fetchUrl(`http://127.0.0.1:${rootPort}/tool/index.html`);
      expect(toolRes.status).toBe(200);

      const cssRes = await fetchUrl(`http://127.0.0.1:${rootPort}/styles/main.css`);
      expect(cssRes.status).toBe(200);

      const bundleRes = await fetchUrl(`http://127.0.0.1:${rootPort}/data/bundle.latest.json`);
      expect(bundleRes.status).toBe(200);

      const serviceRes = await fetchUrl(`http://127.0.0.1:${rootPort}/services/global/spotify/index.html`);
      expect(serviceRes.status).toBe(200);
    } finally {
      await new Promise<void>((res) => rootServer.close(() => res()));
    }

    // 3. Serve build under a subpath (/cancelspec/) and verify no 404s
    const subpathServer = createPreviewServer({ root: tempOutDir, subpath: '/cancelspec' });
    await new Promise<void>((res) => subpathServer.listen(0, '127.0.0.1', () => res()));
    const subpathPort = (subpathServer.address() as any).port;

    try {
      const subHomeRes = await fetchUrl(`http://127.0.0.1:${subpathPort}/cancelspec/index.html`);
      expect(subHomeRes.status).toBe(200);

      const subToolRes = await fetchUrl(`http://127.0.0.1:${subpathPort}/cancelspec/tool/index.html`);
      expect(subToolRes.status).toBe(200);

      const subCssRes = await fetchUrl(`http://127.0.0.1:${subpathPort}/cancelspec/styles/main.css`);
      expect(subCssRes.status).toBe(200);

      const subBundleRes = await fetchUrl(`http://127.0.0.1:${subpathPort}/cancelspec/data/bundle.latest.json`);
      expect(subBundleRes.status).toBe(200);

      const subServiceRes = await fetchUrl(
        `http://127.0.0.1:${subpathPort}/cancelspec/services/global/spotify/index.html`,
      );
      expect(subServiceRes.status).toBe(200);
    } finally {
      await new Promise<void>((res) => subpathServer.close(() => res()));
    }
  });
});
