// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { CompiledPlaybook } from '@cancelspec/spec';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderHallOfShamePage(
  playbooks: CompiledPlaybook[],
  config: ProjectConfig,
): string {
  // Filter services with friction tags
  const frictionServices = playbooks.filter(
    (p) => p.tags && p.tags.length > 0,
  );

  // Sort by difficulty desc, then name asc
  frictionServices.sort((a, b) => {
    if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
    return a.name.localeCompare(b.name);
  });

  const rows = frictionServices
    .map((p) => {
      const tagsList = (p.tags || [])
        .map((t) => `<span class="badge">${escapeHtml(t)}</span>`)
        .join(' ');
      return `
        <tr>
          <td><a href="/services/${p.region.toLowerCase()}/${p.id}/">${escapeHtml(p.name)}</a></td>
          <td>${escapeHtml(p.region)}</td>
          <td><span class="badge badge-difficulty-${p.difficulty}">Level ${p.difficulty}</span></td>
          <td>${tagsList}</td>
        </tr>`;
    })
    .join('\n');

  const content = `
    <h1>Hall of Shame</h1>
    <p>Services cataloged with anti-consumer friction patterns during cancellation (such as requiring telephone calls, retention questionnaires, hidden buttons, or forced app downloads).</p>
    <div class="banner">
      <strong>Methodology:</strong> This listing is generated strictly from verified factual tags documented in our open corpus. No editorial commentary is applied. Learn more in our <a href="/methodology/">Difficulty Rubric & Methodology</a>.
    </div>

    <table aria-label="Hall of shame table">
      <thead>
        <tr>
          <th scope="col">Service</th>
          <th scope="col">Region</th>
          <th scope="col">Difficulty Score</th>
          <th scope="col">Recorded Friction Patterns</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
`;

  return renderLayout({
    title: 'Hall of Shame',
    description: 'Services with high-friction cancellation patterns, derived objectively from verified tags.',
    canonicalPath: '/hall-of-shame/',
    content,
    config,
  });
}
