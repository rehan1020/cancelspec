// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { ProjectConfig } from '../config.js';
import { CONTENT_CSP, TOOL_CSP } from '../generator/headers.js';

export interface LayoutOptions {
  title: string;
  description: string;
  canonicalPath: string;
  content: string;
  config: ProjectConfig;
  isToolPage?: boolean;
}

export function renderLayout(options: LayoutOptions): string {
  const { title, description, canonicalPath, content, config, isToolPage } = options;
  const csp = isToolPage ? TOOL_CSP : CONTENT_CSP;
  const cleanBase = config.site.url.replace(/\/+$/, '');
  const canonicalUrl = `${cleanBase}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;
  const fullTitle = `${escapeHtml(title)} | ${escapeHtml(config.site.title)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>${fullTitle}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header>
    <div class="header-container">
      <a href="/" class="site-title">${escapeHtml(config.site.title)}</a>
      <nav aria-label="Main navigation">
        <ul>
          <li><a href="/services/">Services</a></li>
          <li><a href="/tool/">Scanner Tool</a></li>
          <li><a href="/hall-of-shame/">Hall of Shame</a></li>
          <li><a href="/methodology/">Methodology</a></li>
          <li><a href="/contribute/">Contribute</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main-content">
${content}
  </main>

  <footer>
    <div class="footer-container">
      <div class="footer-nav">
        <a href="/policies/privacy/">Privacy Policy</a>
        <a href="/policies/security/">Security</a>
        <a href="/policies/takedown/">Takedown</a>
        <a href="/policies/nc-policy/">NonCommercial Policy</a>
        <a href="/policies/trademark/">Trademark</a>
        <a href="/spec/">Specification</a>
        <a href="/changelog/">Changelog</a>
        <a href="${escapeHtml(config.repo.url)}" target="_blank" rel="noopener noreferrer">Source Code (GitHub) (opens in new tab)</a>
      </div>
      <p class="footer-disclaimer">${escapeHtml(config.site.footer)}</p>
      <p class="footer-license">
        Code: AGPL-3.0-or-later. Playbook data: CC BY-NC-SA 4.0. Specification: CC BY 4.0.
      </p>
    </div>
  </footer>
</body>
</html>
`;
}
