// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { CompiledPlaybook } from '@cancelspec/spec';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderServicePage(
  playbook: CompiledPlaybook,
  config: ProjectConfig,
): string {
  const title = `How to cancel ${playbook.name} (${playbook.region})`;
  const description = `Step-by-step verified guide to cancel your ${playbook.name} subscription in ${playbook.region}.`;
  const canonicalPath = `/services/${playbook.region.toLowerCase()}/${playbook.id}/`;

  // Status and staleness banner
  let statusBanner = '';
  if (playbook.status === 'stale' || playbook.staleness_days > 180) {
    statusBanner = `
      <div class="banner banner-warning" role="alert">
        <strong>Notice:</strong> This playbook was last verified over 180 days ago (${escapeHtml(playbook.verified_on)}). Steps may have changed.
      </div>`;
  } else if (playbook.status === 'broken') {
    statusBanner = `
      <div class="banner banner-danger" role="alert">
        <strong>Warning:</strong> This playbook has been reported broken. ${escapeHtml(playbook.status_reason)}
      </div>`;
  } else if (playbook.status === 'discontinued') {
    statusBanner = `
      <div class="banner" role="alert">
        <strong>Discontinued:</strong> This service has been discontinued. ${escapeHtml(playbook.status_reason)}
      </div>`;
  }

  // Tags rendering
  const tagsHtml = (playbook.tags || [])
    .map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`)
    .join(' ');

  // Accessibility flag rendering
  const a11yHtml = playbook.accessible_to_cancel
    ? `<span class="badge" style="background-color: var(--success-bg); color: var(--success-color);">Accessible to cancel (no phone or CAPTCHA required)</span>`
    : `<span class="badge" style="background-color: var(--warning-bg); color: var(--warning-color);">Accessibility barrier detected (see alternative below)</span>`;

  // Channels rendering
  const channelsHtml = playbook.channels
    .map((ch, idx) => {
      const channelId = `channel-${ch.channel}-${idx}`;
      const entryLink = ch.entry_url
        ? `<p><a href="${escapeHtml(ch.entry_url)}" target="_blank" rel="noopener noreferrer">Go to ${escapeHtml(playbook.name)} cancellation page (opens in new tab)</a></p>`
        : '';
      const notes = ch.notes ? `<p><em>${escapeHtml(ch.notes)}</em></p>` : '';

      const steps = ch.steps
        .map((step) => {
          if (typeof step === 'string') {
            return `<li>${escapeHtml(step)}</li>`;
          }
          const link = step.link
            ? ` <a href="${escapeHtml(step.link)}" target="_blank" rel="noopener noreferrer">(Link) (opens in new tab)</a>`
            : '';
          return `<li>${escapeHtml(step.action)}${link}</li>`;
        })
        .join('\n');

      const stepsList = ch.steps.length > 0 ? `<ol class="steps-list">\n${steps}\n</ol>` : '';

      return `
        <section class="card" aria-labelledby="${channelId}">
          <h3 id="${channelId}">Billed via ${escapeHtml(ch.channel)}</h3>
          ${entryLink}
          ${stepsList}
          ${notes}
        </section>`;
    })
    .join('\n');

  // Facts rendering
  let factsHtml = '';
  if (playbook.notice_period || playbook.refund_window || playbook.auto_renews) {
    const factsList: string[] = [];
    if (playbook.notice_period) {
      factsList.push(
        `<li><strong>Notice Period:</strong> ${escapeHtml(String(playbook.notice_period.value))} (<a href="${escapeHtml(playbook.notice_period.source)}" target="_blank" rel="noopener noreferrer">Source</a>)</li>`,
      );
    }
    if (playbook.refund_window) {
      factsList.push(
        `<li><strong>Refund Window:</strong> ${escapeHtml(String(playbook.refund_window.value))} (<a href="${escapeHtml(playbook.refund_window.source)}" target="_blank" rel="noopener noreferrer">Source</a>)</li>`,
      );
    }
    if (playbook.auto_renews) {
      factsList.push(
        `<li><strong>Auto Renews:</strong> ${playbook.auto_renews.value ? 'Yes' : 'No'} (<a href="${escapeHtml(playbook.auto_renews.source)}" target="_blank" rel="noopener noreferrer">Source</a>)</li>`,
      );
    }
    factsHtml = `
      <section aria-labelledby="facts-heading">
        <h2 id="facts-heading">Subscription Facts</h2>
        <ul>
          ${factsList.join('\n')}
        </ul>
      </section>`;
  }

  // Pre-filled issue URL carrying only the service id
  const issueUrl = `${config.repo.url}/issues/new?title=Correction+for+${encodeURIComponent(playbook.id)}&body=Service+ID:+${encodeURIComponent(playbook.id)}%0A%0APlease+describe+what+changed+or+is+incorrect:`;

  const content = `
    <nav aria-label="Breadcrumb">
      <p><small><a href="/services/">Services</a> &gt; <a href="/services/region/${playbook.region.toLowerCase()}/">${escapeHtml(playbook.region)}</a> &gt; ${escapeHtml(playbook.name)}</small></p>
    </nav>

    <h1>How to cancel ${escapeHtml(playbook.name)} (${escapeHtml(playbook.region)})</h1>

    ${statusBanner}

    <div class="card" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;">
      <div>
        <p style="margin: 0;"><strong>Category:</strong> <a href="/services/category/${encodeURIComponent(playbook.category)}/">${escapeHtml(playbook.category)}</a></p>
        <p style="margin: 0;"><small>Official Website: <a href="${escapeHtml(playbook.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(playbook.website)} (opens in new tab)</a></small></p>
      </div>
      <div>
        <span class="badge badge-difficulty-${playbook.difficulty}">Difficulty: Level ${playbook.difficulty} / 5</span>
        <span class="badge outcome-badge">Outcome: ${escapeHtml(playbook.outcome || 'cancel')}</span>
        ${a11yHtml}
      </div>
    </div>

    ${tagsHtml ? `<div style="margin-bottom: 1.5rem;"><strong>Friction flags:</strong> ${tagsHtml}</div>` : ''}

    ${playbook.accessible_alternative ? `<div class="card"><strong>Accessible Route:</strong> ${escapeHtml(playbook.accessible_alternative)}</div>` : ''}

    <section aria-labelledby="where-you-pay-heading">
      <h2 id="where-you-pay-heading">Where do you pay?</h2>
      <p>Select how you subscribed to follow the exact steps:</p>
      ${channelsHtml}
    </section>

    ${factsHtml}

    <section aria-labelledby="provenance-heading" style="margin-top: 2rem;">
      <h2 id="provenance-heading">Verification & Sources</h2>
      <p><small>Last verified on <strong>${escapeHtml(playbook.verified_on)}</strong> using <strong>${escapeHtml(playbook.verification_method)}</strong> by community contributors (${escapeHtml(playbook.contributors.join(', '))}).</small></p>
      <ul>
        ${playbook.sources.map((s) => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.url)} (opens in new tab)</a> (Accessed ${escapeHtml(s.accessed_on)})${s.sha256 ? ` <small style="color: var(--text-muted); font-family: monospace;">[SHA-256: ${escapeHtml(s.sha256.slice(0, 12))}...]</small>` : ''}</li>`).join('\n')}
      </ul>
      <p><small>Is this information incorrect? <a href="${escapeHtml(issueUrl)}" target="_blank" rel="noopener noreferrer">Suggest a correction on GitHub (opens in new tab)</a>.</small></p>
    </section>
`;

  return renderLayout({
    title,
    description,
    canonicalPath,
    content,
    config,
  });
}
