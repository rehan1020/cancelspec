// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderContributePage(config: ProjectConfig): string {
  const content = `
    <h1>How to Contribute</h1>
    <p>CancelSpec is a community-driven open dataset. Anyone can add or update a cancellation playbook in about 10 minutes.</p>

    <section aria-labelledby="steps-heading">
      <h2 id="steps-heading">Adding a New Playbook</h2>
      <ol class="steps-list">
        <li><strong>Scaffold:</strong> Run <code>npx cancelspec new &lt;region&gt; &lt;service-id&gt;</code> in your terminal.</li>
        <li><strong>Verify:</strong> Check the official help page or test cancellation directly.</li>
        <li><strong>Write Steps:</strong> Write short, plain-English instructions (max 200 characters per step, starting with a verb).</li>
        <li><strong>Record Evidence:</strong> Add the official source URL and date accessed.</li>
        <li><strong>Lint:</strong> Run <code>npx cancelspec lint</code> to verify your file passes all checks.</li>
        <li><strong>Submit:</strong> Open a pull request with DCO sign-off (<code>git commit -s</code>).</li>
      </ol>
    </section>

    <section aria-labelledby="rules-heading">
      <h2 id="rules-heading">Essential Rules</h2>
      <ul>
        <li><strong>No real personal or financial data:</strong> Never include real bank statements or customer numbers.</li>
        <li><strong>No copyright infringement:</strong> Write steps in your own words; do not copy and paste text directly from company websites.</li>
        <li><strong>No logos:</strong> Do not add corporate logos or trademarks.</li>
        <li><strong>No legal advice:</strong> Avoid legalistic phrasing; focus purely on the functional steps to cancel.</li>
      </ul>
      <p>Visit the <a href="${escapeHtml(config.repo.url)}" target="_blank" rel="noopener noreferrer">CancelSpec GitHub Repository (opens in new tab)</a> to get started.</p>
    </section>
`;

  return renderLayout({
    title: 'Contribute a Playbook',
    description: 'How to add or update cancellation playbooks in CancelSpec.',
    canonicalPath: '/contribute/',
    content,
    config,
  });
}
