// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { CompiledPlaybook, Tag } from '@cancelspec/spec';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

const TAG_LABELS: Record<Tag, string> = {
  'phone-required': 'Phone Call Required',
  'chat-only': 'Live Chat Only',
  'email-only': 'Email Only',
  'retention-offer': 'Retention Offers',
  'survey-wall': 'Forced Exit Survey',
  'hidden-entry': 'Hidden Cancel Button',
  captcha: 'CAPTCHA Challenge',
  'app-required': 'Mobile App Required',
  'in-person': 'In-Person Visit Required',
  'fee-on-exit': 'Exit / Cancellation Fee',
  'long-notice': 'Extended Notice Period',
};

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

  // Calculate stats by tag
  const tagCounts = new Map<Tag, number>();
  for (const p of frictionServices) {
    for (const tag of p.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const statPills = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(
      ([tag, count]) =>
        `<span class="badge" style="margin: 0.25rem;">${escapeHtml(TAG_LABELS[tag] || tag)}: <strong>${count}</strong></span>`,
    )
    .join(' ');

  const rows = frictionServices
    .map((p) => {
      const tagsList = (p.tags || [])
        .map(
          (t) =>
            `<span class="badge badge-warning" style="margin-right: 0.35rem; margin-bottom: 0.25rem; display: inline-block;">${escapeHtml(TAG_LABELS[t] || t)}</span>`,
        )
        .join(' ');

      const accessibilityBadge = !p.accessible_to_cancel
        ? `<span class="badge badge-danger" style="margin-left: 0.5rem;" title="Lacks an accessible non-phone/non-CAPTCHA route">Inaccessible Route</span>`
        : '';

      return `
        <tr>
          <td>
            <a href="/services/${p.region.toLowerCase()}/${p.id}/"><strong>${escapeHtml(p.name)}</strong></a>
            ${accessibilityBadge}
          </td>
          <td>${escapeHtml(p.region)}</td>
          <td><span class="badge difficulty-${p.difficulty}">Difficulty ${p.difficulty}/5</span></td>
          <td>${tagsList}</td>
        </tr>`;
    })
    .join('\n');

  const content = `
    <h1>Hall of Shame</h1>
    <p>A community catalog of subscription services with verified anti-consumer friction patterns during the cancellation process.</p>
    
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.15rem; margin-top: 0;">Common Friction Patterns Cataloged</h2>
      <div style="display: flex; flex-wrap: wrap; margin-top: 0.75rem;">
        ${statPills || '<p class="text-muted">No friction patterns cataloged yet.</p>'}
      </div>
    </div>

    <div class="banner banner-warning" role="region" aria-label="Methodology disclaimer">
      <strong>Objective Evidence Standard:</strong> This listing is generated strictly from verifiable technical and interaction tags documented in our open-source playbooks. We do not use subjective editorial opinions. Read our full criteria on the <a href="/methodology/">Methodology & Rubric page</a>.
    </div>

    <div style="overflow-x: auto; margin-top: 1.5rem;">
      <table class="table" aria-label="Hall of shame table">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Region</th>
            <th scope="col">Difficulty Level</th>
            <th scope="col">Verified Friction Patterns</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No services with friction tags currently cataloged.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div style="margin-top: 2.5rem; text-align: center;">
      <p>Have you encountered friction canceling a service not listed here?</p>
      <a href="/contribute/" class="btn btn-outline">Learn how to contribute a playbook</a>
    </div>
`;

  return renderLayout({
    title: 'Hall of Shame',
    description: 'Services with high-friction cancellation patterns, derived objectively from verified community playbooks.',
    canonicalPath: '/hall-of-shame/',
    content,
    config,
  });
}
