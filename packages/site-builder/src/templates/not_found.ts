// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderNotFoundPage(config: ProjectConfig): string {
  const content = `
    <h1>Page Not Found</h1>
    <p>The page you requested does not exist or may have moved.</p>
    <p>You can browse our <a href="/services/">Services Directory</a> or return to the <a href="/">Home Page</a>.</p>
`;

  return renderLayout({
    title: 'Page Not Found',
    description: '404 - Page Not Found',
    canonicalPath: '/404.html',
    content,
    config,
  });
}
