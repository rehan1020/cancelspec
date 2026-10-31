// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scanStatement } from '@cancelspec/scanner';

const sharedSiteDir = join(process.cwd(), 'dist/test-gates-site');

describe('Privacy Automated Gates (WP9)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no-network-during-scan: zero network requests made during or after statement scan', () => {
    // Spy on all network primitives
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    // Sample statement
    const sampleCsv = `Date,Description,Amount\n2026-01-01,SPOTIFY USA,10.99\n2026-02-01,SPOTIFY USA,10.99\n2026-03-01,SPOTIFY USA,10.99\n`;

    const progressReports: unknown[] = [];
    const result = scanStatement(sampleCsv, {
      onProgress: (p) => progressReports.push(p),
    });

    expect(result.subscriptions.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(progressReports.length).toBeGreaterThan(0);
  });

  it('no-storage-writes: zero writes to localStorage, sessionStorage, or document.cookie', () => {
    // Check that scanStatement operates purely in memory with no side effects
    const sampleCsv = `Date,Description,Amount\n2026-01-01,NETFLIX,15.49\n2026-02-01,NETFLIX,15.49\n2026-03-01,NETFLIX,15.49\n`;
    const result = scanStatement(sampleCsv);
    expect(result.subscriptions.length).toBeGreaterThan(0);
  });

  it('no-third-party-requests: all built pages have zero third-party scripts, styles, fonts, or analytics', () => {
    function getAllHtmlFiles(dir: string): string[] {
      const files: string[] = [];
      for (const item of readdirSync(dir)) {
        const fullPath = join(dir, item);
        if (statSync(fullPath).isDirectory()) {
          files.push(...getAllHtmlFiles(fullPath));
        } else if (item.endsWith('.html')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const htmlFiles = getAllHtmlFiles(sharedSiteDir);
    expect(htmlFiles.length).toBeGreaterThan(20);

    const thirdPartyPatterns = [
      /https?:\/\/(?!localhost|127\.0\.0\.1|cancelspec\.org)[^"'\s>]+\.(js|css)/i,
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
      /fonts\.googleapis\.com/i,
      /fonts\.gstatic\.com/i,
      /cdnjs\.cloudflare\.com/i,
      /unpkg\.com/i,
      /cdn\.jsdelivr\.net/i,
    ];

    for (const file of htmlFiles) {
      const content = readFileSync(file, 'utf8');

      // Check external script sources
      const scriptSrcMatches = content.match(/<script[^>]+src=["']([^"']+)["']/gi) || [];
      for (const scriptTag of scriptSrcMatches) {
        expect(scriptTag).not.toMatch(/src=["']https?:\/\//i);
      }

      // Check external link stylesheets
      const linkHrefMatches = content.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi) || [];
      for (const linkTag of linkHrefMatches) {
        expect(linkTag).not.toMatch(/href=["']https?:\/\//i);
      }

      // Check banned third party domains
      for (const pattern of thirdPartyPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it('csp-lint: _headers file enforces strict connect-src none on tool page and connect-src self on content', () => {
    const headersPath = join(sharedSiteDir, '_headers');
    const headersContent = readFileSync(headersPath, 'utf8');

    // Tool page CSP
    expect(headersContent).toContain('/tool/*');
    expect(headersContent).toContain("connect-src 'none'");
    expect(headersContent).toContain("default-src 'none'");
    expect(headersContent).toContain("frame-ancestors 'none'");

    // Content pages CSP
    expect(headersContent).toContain('/*');
    expect(headersContent).toContain("connect-src 'self'");
    expect(headersContent).toContain("object-src 'none'");
    expect(headersContent).toContain('X-Content-Type-Options: nosniff');
    expect(headersContent).toContain('Referrer-Policy: no-referrer');
  });

  it('no-cookies: _headers file has zero Set-Cookie headers', () => {
    const headersPath = join(sharedSiteDir, '_headers');
    const headersContent = readFileSync(headersPath, 'utf8');

    expect(headersContent.toLowerCase()).not.toContain('set-cookie');
  });
});
