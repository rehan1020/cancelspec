// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sharedSiteDir = join(process.cwd(), 'dist/test-gates-site');

describe('Size Budgets & JS Gates (WP9)', () => {
  it('home page is 60 KB or less transfer size', () => {
    const homePath = join(sharedSiteDir, 'index.html');
    const sizeBytes = statSync(homePath).size;
    const sizeKb = sizeBytes / 1024;

    console.log(`Home page size: ${sizeKb.toFixed(2)} KB (budget <= 60 KB)`);
    expect(sizeKb).toBeLessThanOrEqual(60);
  });

  it('every service page is 100 KB or less and requires 0 JavaScript', () => {
    const servicesDir = join(sharedSiteDir, 'services');

    function checkServicePages(dir: string) {
      for (const item of readdirSync(dir)) {
        const fullPath = join(dir, item);
        if (statSync(fullPath).isDirectory()) {
          checkServicePages(fullPath);
        } else if (item === 'index.html' && fullPath.includes('services/')) {
          const sizeBytes = statSync(fullPath).size;
          const sizeKb = sizeBytes / 1024;
          expect(sizeKb).toBeLessThanOrEqual(100);

          // Zero required JavaScript: No script tags on service pages
          const html = readFileSync(fullPath, 'utf8');
          expect(html).not.toMatch(/<script\b[^>]*>/i);
        }
      }
    }

    checkServicePages(servicesDir);
  });

  it('tool page including Worker and embedded index is 300 KB or less', () => {
    const toolPath = join(sharedSiteDir, 'tool/index.html');
    const appJsPath = join(sharedSiteDir, 'scripts/scanner-app.js');
    const workerJsPath = join(sharedSiteDir, 'scripts/scanner-worker.js');
    const cssPath = join(sharedSiteDir, 'styles/main.css');

    const totalToolBytes =
      statSync(toolPath).size +
      statSync(appJsPath).size +
      statSync(workerJsPath).size +
      statSync(cssPath).size;

    const totalToolKb = totalToolBytes / 1024;
    console.log(`Tool total transfer size: ${totalToolKb.toFixed(2)} KB (budget <= 300 KB)`);

    expect(totalToolKb).toBeLessThanOrEqual(300);
  });

  it('main stylesheet is 30 KB or less', () => {
    const cssPath = join(sharedSiteDir, 'styles/main.css');
    const sizeKb = statSync(cssPath).size / 1024;
    expect(sizeKb).toBeLessThanOrEqual(30);
  });
});
