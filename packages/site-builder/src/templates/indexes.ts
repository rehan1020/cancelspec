// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { CompiledPlaybook } from '@cancelspec/spec';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderServicesIndexPage(
  playbooks: CompiledPlaybook[],
  config: ProjectConfig,
): string {
  if (playbooks.length === 0) {
    const emptyContent = `
    <h1>All Subscription Services</h1>
    <p>Browse step-by-step verified cancellation playbooks across all regions. No JavaScript required.</p>
    <div class="banner banner-info" style="margin: 1.5rem 0;">
      <p>No verified playbooks are published yet. All playbooks are currently in draft status awaiting human verification.</p>
    </div>
`;
    return renderLayout({
      title: 'Services Directory',
      description: 'Complete directory of subscription cancellation playbooks.',
      canonicalPath: '/services/',
      content: emptyContent,
      config,
    });
  }

  const serviceRows = playbooks
    .map(
      (p) => `
      <tr>
        <td><a href="/services/${p.region.toLowerCase()}/${p.id}/">${escapeHtml(p.name)}</a></td>
        <td><a href="/services/region/${p.region.toLowerCase()}/">${escapeHtml(p.region)}</a></td>
        <td><a href="/services/category/${encodeURIComponent(p.category)}/">${escapeHtml(p.category)}</a></td>
        <td><span class="badge badge-difficulty-${p.difficulty}">Level ${p.difficulty}</span></td>
      </tr>`,
    )
    .join('\n');

  const activeRegions = Array.from(new Set(playbooks.map((p) => p.region.toLowerCase()))).sort();
  const regionBadges = activeRegions
    .map((r) => `<a href="/services/region/${r}/" class="badge">${r.toUpperCase()}</a>`)
    .join(' ');

  const content = `
    <h1>All Subscription Services</h1>
    <p>Browse step-by-step verified cancellation playbooks across all regions. No JavaScript required.</p>

    <div style="margin: 1.5rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
      <strong>Filter by Region:</strong>
      ${regionBadges}
    </div>

    <table aria-label="Services directory table">
      <thead>
        <tr>
          <th scope="col">Service Name</th>
          <th scope="col">Region</th>
          <th scope="col">Category</th>
          <th scope="col">Difficulty</th>
        </tr>
      </thead>
      <tbody>
        ${serviceRows}
      </tbody>
    </table>
`;

  return renderLayout({
    title: 'Services Directory',
    description: 'Complete directory of subscription cancellation playbooks.',
    canonicalPath: '/services/',
    content,
    config,
  });
}

export function renderCategoryIndexPage(
  category: string,
  playbooks: CompiledPlaybook[],
  config: ProjectConfig,
): string {
  const serviceRows = playbooks
    .map(
      (p) => `
      <tr>
        <td><a href="/services/${p.region.toLowerCase()}/${p.id}/">${escapeHtml(p.name)}</a></td>
        <td><a href="/services/region/${p.region.toLowerCase()}/">${escapeHtml(p.region)}</a></td>
        <td><span class="badge badge-difficulty-${p.difficulty}">Level ${p.difficulty}</span></td>
      </tr>`,
    )
    .join('\n');

  const content = `
    <nav aria-label="Breadcrumb">
      <p><small><a href="/services/">Services</a> &gt; Category &gt; ${escapeHtml(category)}</small></p>
    </nav>

    <h1>Category: ${escapeHtml(category)}</h1>
    <p>Showing ${playbooks.length} cancellation playbooks in this category.</p>

    <table aria-label="Category services table">
      <thead>
        <tr>
          <th scope="col">Service Name</th>
          <th scope="col">Region</th>
          <th scope="col">Difficulty</th>
        </tr>
      </thead>
      <tbody>
        ${serviceRows}
      </tbody>
    </table>
`;

  return renderLayout({
    title: `Category: ${category}`,
    description: `How to cancel ${category} subscriptions.`,
    canonicalPath: `/services/category/${category}/`,
    content,
    config,
  });
}

export function renderRegionIndexPage(
  region: string,
  playbooks: CompiledPlaybook[],
  config: ProjectConfig,
): string {
  const serviceRows = playbooks
    .map(
      (p) => `
      <tr>
        <td><a href="/services/${p.region.toLowerCase()}/${p.id}/">${escapeHtml(p.name)}</a></td>
        <td><a href="/services/category/${encodeURIComponent(p.category)}/">${escapeHtml(p.category)}</a></td>
        <td><span class="badge badge-difficulty-${p.difficulty}">Level ${p.difficulty}</span></td>
      </tr>`,
    )
    .join('\n');

  const content = `
    <nav aria-label="Breadcrumb">
      <p><small><a href="/services/">Services</a> &gt; Region &gt; ${escapeHtml(region.toUpperCase())}</small></p>
    </nav>

    <h1>Region: ${escapeHtml(region.toUpperCase())}</h1>
    <p>Showing ${playbooks.length} cancellation playbooks for ${escapeHtml(region.toUpperCase())}.</p>

    <table aria-label="Region services table">
      <thead>
        <tr>
          <th scope="col">Service Name</th>
          <th scope="col">Category</th>
          <th scope="col">Difficulty</th>
        </tr>
      </thead>
      <tbody>
        ${serviceRows}
      </tbody>
    </table>
`;

  return renderLayout({
    title: `Region: ${region.toUpperCase()}`,
    description: `How to cancel subscriptions in ${region.toUpperCase()}.`,
    canonicalPath: `/services/region/${region.toLowerCase()}/`,
    content,
    config,
  });
}
