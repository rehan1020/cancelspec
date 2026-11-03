// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderToolPage(config: ProjectConfig, serviceCount: number = 0): string {
  const verifiedNotice =
    serviceCount === 0
      ? `<div class="banner banner-info" role="region" aria-label="Playbook corpus notice" style="margin-top: 1rem;">
          <strong>Notice:</strong> No verified playbooks are published yet. You can still scan bank statements to detect recurring subscriptions, but step-by-step cancellation guides will appear once playbooks are verified.
        </div>`
      : '';

  const content = `
    <h1>Statement Scanner & Subscription Finder</h1>

    <div class="banner banner-warning" role="region" aria-label="Privacy guarantee">
      <strong>Zero-Data Guarantee:</strong> This tool runs entirely in your browser using a Web Worker. No statement data leaves your device, no network requests are made, and nothing is saved to cookies or local storage.
    </div>

    ${verifiedNotice}

    <noscript>
      <div class="banner banner-danger">
        <h2>JavaScript Required for In-Browser Scanning</h2>
        <p>The statement scanner runs client-side inside a Web Worker so that your financial data never touches a server.</p>
        <p>To use CancelSpec without JavaScript, you can browse all cancellation instructions directly in our <a href="/services/">Services Directory</a>.</p>
      </div>
    </noscript>

    <div id="tool-app">
      <!-- Container where tool UI mounts -->
      <section class="card" aria-labelledby="intake-heading">
        <h2 id="intake-heading">1. Drop in your bank statement</h2>
        <p>Accepts CSV, TSV, or TXT statements (up to 20 MB). Columns and dates are parsed locally.</p>

        <div style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 2.5rem 1rem; text-align: center; margin: 1.5rem 0;">
          <input type="file" id="statement-file-input" accept=".csv,.tsv,.txt" aria-label="Choose bank statement file" style="margin-bottom: 1rem;">
          <p style="margin: 0; color: var(--text-muted);"><small>Drag and drop a statement file here or use the file picker above.</small></p>
        </div>

        <p><small>Don't want to upload a statement? <a href="/services/">Browse cancellation instructions by hand</a>.</small></p>
      </section>
    </div>

    <script type="module" src="/scripts/scanner-app.js"></script>
`;

  return renderLayout({
    title: 'Subscription Scanner Tool',
    description: 'Find recurring subscriptions in your bank statement. 100% private, runs offline in your browser.',
    canonicalPath: '/tool/',
    content,
    config,
    isToolPage: true,
  });
}
