// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

const sharedSiteDir = join(process.cwd(), 'dist/test-gates-site');

describe('Accessibility Automated Gates (A11Y-1 to A11Y-4) (WP9)', () => {
  const testPages = [
    { name: 'Home Page', path: 'index.html' },
    { name: 'Tool Page', path: 'tool/index.html' },
    { name: 'Service Page', path: 'services/global/spotify/index.html' },
    { name: 'Services Directory', path: 'services/index.html' },
    { name: 'Category Index', path: 'services/category/streaming-video/index.html' },
    { name: 'Region Index', path: 'services/region/global/index.html' },
    { name: 'Hall of Shame', path: 'hall-of-shame/index.html' },
    { name: 'Methodology', path: 'methodology/index.html' },
    { name: 'Spec Docs', path: 'spec/index.html' },
    { name: 'Contribute', path: 'contribute/index.html' },
    { name: 'Search', path: 'search/index.html' },
    { name: '404 Page', path: '404.html' },
  ];

  for (const page of testPages) {
    it(`runs axe-core WCAG 2.2 AA audit on ${page.name}`, async () => {
      const fullPath = join(sharedSiteDir, page.path);
      const html = readFileSync(fullPath, 'utf8');

      document.documentElement.innerHTML = html;

      // Axe audit (filtering known jsdom limitations like color-contrast which requires real layout)
      const results = await axe.run(document.body, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
        },
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      });

      if (results.violations.length > 0) {
        console.error(`Axe violations on ${page.name}:`, JSON.stringify(results.violations, null, 2));
      }

      expect(results.violations.length).toBe(0);
    });

    it(`verifies heading hierarchy and skip links on ${page.name}`, () => {
      const fullPath = join(sharedSiteDir, page.path);
      const html = readFileSync(fullPath, 'utf8');
      document.documentElement.innerHTML = html;

      // Exactly one h1 per page
      const h1List = document.querySelectorAll('h1');
      expect(h1List.length).toBe(1);

      // Skip link present and targets main-content
      const skipLink = document.querySelector('.skip-link');
      expect(skipLink).not.toBeNull();
      expect(skipLink?.getAttribute('href')).toBe('#main-content');
      expect(document.getElementById('main-content')).not.toBeNull();

      // Landmarks
      expect(document.querySelector('header')).not.toBeNull();
      expect(document.querySelector('main')).not.toBeNull();
      expect(document.querySelector('footer')).not.toBeNull();
    });
  }

  it('validates responsive styles: prefers-reduced-motion and forced-colors rules exist', () => {
    const cssPath = join(sharedSiteDir, 'styles/main.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');
    expect(css).toContain('--focus-ring');
  });
});
