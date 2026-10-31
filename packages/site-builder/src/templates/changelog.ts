// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderChangelogPage(config: ProjectConfig): string {
  const content = `
    <h1>Changelog</h1>
    <p>Track releases, dataset updates, and specification changes.</p>

    <section aria-labelledby="release-v010">
      <h2 id="release-v010">Version 0.1.0 (2026-10-31)</h2>
      <p>Initial release candidate of the CancelSpec dataset and static website.</p>
      <ul>
        <li>Initial schema and specification (v0.1.0)</li>
        <li>10 verified reference cancellation playbooks across GLOBAL, US, UK, EU, and IN</li>
        <li>Deterministic release bundle writer</li>
        <li>Zero-persisting in-browser statement scanner specification</li>
        <li>Difficulty scoring rubric v0</li>
      </ul>
    </section>
`;

  return renderLayout({
    title: 'Changelog',
    description: 'Release history and playbook dataset updates.',
    canonicalPath: '/changelog/',
    content,
    config,
  });
}
