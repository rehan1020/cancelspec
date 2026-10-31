// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  CATEGORIES,
  CHANNELS,
  SPEC_VERSION,
  STATUSES,
  TAGS,
  VERIFICATION_METHODS,
} from '@cancelspec/spec';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderSpecDocsPage(config: ProjectConfig): string {
  const content = `
    <h1>CancelSpec Playbook Specification</h1>
    <p>Version <strong>${SPEC_VERSION}</strong>. Licensed under CC BY 4.0.</p>

    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overview</h2>
      <p>CancelSpec playbooks are authored as single YAML documents in <code>playbooks/REGION/service-id.yaml</code>. Regions include <code>GLOBAL</code>, <code>US</code>, <code>UK</code>, <code>EU</code>, and <code>IN</code>. Service IDs must be lowercase kebab-case ASCII.</p>
    </section>

    <section aria-labelledby="fields-heading">
      <h2 id="fields-heading">Fields Reference</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Type</th>
            <th scope="col">Required</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>id</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>Lowercase kebab-case ASCII identifier (e.g. <code>spotify</code>)</td>
          </tr>
          <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>Plain text official service name (no HTML/Markdown)</td>
          </tr>
          <tr>
            <td><code>aliases</code></td>
            <td>string[]</td>
            <td>No</td>
            <td>Common alternative names</td>
          </tr>
          <tr>
            <td><code>category</code></td>
            <td>enum</td>
            <td>Yes</td>
            <td>One of the predefined service categories</td>
          </tr>
          <tr>
            <td><code>website</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>Official domain or https URL</td>
          </tr>
          <tr>
            <td><code>merchant_patterns</code></td>
            <td>string[]</td>
            <td>Yes</td>
            <td>Uppercase statement descriptor patterns. Only <code>*</code> wildcard allowed.</td>
          </tr>
          <tr>
            <td><code>channels</code></td>
            <td>list</td>
            <td>Yes</td>
            <td>List of cancellation channels with ordered steps (max 200 chars each)</td>
          </tr>
          <tr>
            <td><code>tags</code></td>
            <td>enum[]</td>
            <td>No</td>
            <td>Friction tags from the controlled enum vocabulary</td>
          </tr>
          <tr>
            <td><code>accessible_alternative</code></td>
            <td>string</td>
            <td>No</td>
            <td>Description of accessible non-phone route if present</td>
          </tr>
          <tr>
            <td><code>verified_on</code></td>
            <td>string (YYYY-MM-DD)</td>
            <td>Yes</td>
            <td>Date of last verification</td>
          </tr>
          <tr>
            <td><code>verification_method</code></td>
            <td>enum</td>
            <td>Yes</td>
            <td>first-hand, official-help-page, or community-report</td>
          </tr>
          <tr>
            <td><code>sources</code></td>
            <td>list</td>
            <td>Yes</td>
            <td>Reference URLs with access dates</td>
          </tr>
          <tr>
            <td><code>status</code></td>
            <td>enum</td>
            <td>Yes</td>
            <td>draft, active, stale, broken, discontinued</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section aria-labelledby="enums-heading">
      <h2 id="enums-heading">Controlled Vocabularies (Enums)</h2>

      <h3>Channels</h3>
      <p><code>${CHANNELS.join(', ')}</code></p>

      <h3>Categories</h3>
      <p><code>${CATEGORIES.join(', ')}</code></p>

      <h3>Friction Tags</h3>
      <p><code>${TAGS.join(', ')}</code></p>

      <h3>Verification Methods</h3>
      <p><code>${VERIFICATION_METHODS.join(', ')}</code></p>

      <h3>Status</h3>
      <p><code>${STATUSES.join(', ')}</code></p>
    </section>
`;

  return renderLayout({
    title: 'Playbook Specification',
    description: 'Format, fields, and schema specifications for CancelSpec playbooks.',
    canonicalPath: '/spec/',
    content,
    config,
  });
}
