// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderMethodologyPage(config: ProjectConfig): string {
  const content = `
    <h1>Difficulty Rubric & Verification Methodology</h1>
    <p>CancelSpec calculates difficulty objectively using an open, deterministic rubric. Scores are never subjectively assigned by authors or editors.</p>

    <section aria-labelledby="rubric-heading" class="card" style="margin-bottom: 2rem;">
      <h2 id="rubric-heading">1. Difficulty Rubric v0</h2>
      <p>Points are computed based on verifiable friction signals observed in the primary cancellation flow:</p>
      <div style="overflow-x: auto; margin: 1.5rem 0;">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Signal</th>
              <th scope="col">Points Added</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>4 to 6 steps</code> / <code>7+ steps</code></td>
              <td><strong>1.0 pt / 2.0 pts</strong></td>
              <td>Total length of cancellation interaction funnel</td>
            </tr>
            <tr>
              <td><code>phone-required</code></td>
              <td><strong>2.0 pts</strong></td>
              <td>Requires calling customer support representative via telephone</td>
            </tr>
            <tr>
              <td><code>chat-only</code></td>
              <td><strong>1.0 pt</strong></td>
              <td>Must initiate and maintain live text chat with an agent</td>
            </tr>
            <tr>
              <td><code>retention-offer</code></td>
              <td><strong>1.0 pt</strong></td>
              <td>Forced discount or retention offer screens interrupting cancellation</td>
            </tr>
            <tr>
              <td><code>survey-wall</code></td>
              <td><strong>0.5 pts</strong></td>
              <td>Mandatory survey questions or questionnaires to proceed</td>
            </tr>
            <tr>
              <td><code>hidden-entry</code></td>
              <td><strong>1.0 pt</strong></td>
              <td>Cancellation entrypoint is concealed in unrelated submenus or misleadingly titled</td>
            </tr>
            <tr>
              <td><code>captcha</code></td>
              <td><strong>1.0 pt</strong></td>
              <td>CAPTCHA challenge required to submit cancellation request</td>
            </tr>
            <tr>
              <td><code>app-required</code></td>
              <td><strong>1.0 pt</strong></td>
              <td>Cannot cancel on the web; mobile iOS/Android app installation required</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Score Bands</h3>
      <p>Raw point totals map directly to difficulty ratings 1 through 5:</p>
      <ul>
        <li><strong>Level 1 (Easy):</strong> 0 to 1.0 points</li>
        <li><strong>Level 2 (Moderate):</strong> 1.5 to 2.5 points</li>
        <li><strong>Level 3 (Challenging):</strong> 3.0 to 4.0 points</li>
        <li><strong>Level 4 (High Friction):</strong> 4.5 to 5.5 points</li>
        <li><strong>Level 5 (Severe Friction):</strong> 6.0 or more points</li>
      </ul>
    </section>

    <section aria-labelledby="a11y-heading" class="card" style="margin-bottom: 2rem;">
      <h2 id="a11y-heading">2. Accessibility Rating (accessible_to_cancel)</h2>
      <p>A playbook is evaluated for barriers affecting users with disabilities. It is marked <code>accessible_to_cancel: false</code> when cancellation requires:</p>
      <ul>
        <li>A voice telephone call (barring d/Deaf and hard-of-hearing users), or</li>
        <li>A visual or interactive CAPTCHA without equivalent accessible alternatives, or</li>
        <li>A mobile application requiring gesture/touch interactions without screen reader support.</li>
      </ul>
      <p>If an alternative accessible path is verified (such as a 24/7 web form or accessible chat), the service retains <code>accessible_to_cancel: true</code>.</p>
    </section>

    <section aria-labelledby="verification-heading" class="card" style="margin-bottom: 2rem;">
      <h2 id="verification-heading">3. Evidence Standards & Verification Hierarchy</h2>
      <p>Playbook accuracy is maintained through three hierarchical tiers of evidence:</p>
      <ol>
        <li><strong>First-hand verification:</strong> Performed directly by a verified contributor using an active account or free trial.</li>
        <li><strong>Official help page:</strong> Step-by-step documentation published on the service provider's verified official domain.</li>
        <li><strong>Community report:</strong> Independent user reports submitted through public issues, flagged for reviewer confirmation.</li>
      </ol>
      <p>Every published playbook records its verification source URL and the exact access date.</p>
    </section>

    <section aria-labelledby="staleness-heading" class="card" style="margin-bottom: 2rem;">
      <h2 id="staleness-heading">4. Staleness & Broken Playbook Policies</h2>
      <p>To guarantee that instructions remain accurate as services redesign their websites:</p>
      <ul>
        <li><strong>180-Day Staleness Warning:</strong> Playbooks with <code>verified_on</code> older than 180 days automatically display an advisory banner alerting users that the steps may have changed.</li>
        <li><strong>365-Day Archive Review:</strong> Playbooks unverified after 365 days are queued for re-verification and review.</li>
        <li><strong>Broken Playbooks:</strong> Three independent community reports automatically flag a playbook as <code>status: broken</code> until re-verified.</li>
      </ul>
    </section>

    <section aria-labelledby="privacy-heading" class="card" style="margin-bottom: 2rem;">
      <h2 id="privacy-heading">5. Zero-Data Privacy Architecture</h2>
      <p>CancelSpec does not operate a backend analysis server. The statement scanner runs completely inside your browser using a client-side Web Worker. The tool page enforces a Content Security Policy of <code>connect-src 'none'</code>, mathematically preventing any network transmission of financial data. No cookies, tracking tokens, or storage APIs are utilized.</p>
    </section>

    <div class="banner">
      <strong>Informational Disclaimer:</strong> CancelSpec provides factual cancellation navigation guides authored and maintained by the open-source community. This site does not provide legal advice, financial advice, or automated contract termination services. Service trademarks belong to their respective owners and appear solely for factual identification.
    </div>
`;

  return renderLayout({
    title: 'Methodology & Rubric',
    description: 'How CancelSpec computes difficulty scores, assesses accessibility, and verifies cancellation steps objectively.',
    canonicalPath: '/methodology/',
    content,
    config,
  });
}
