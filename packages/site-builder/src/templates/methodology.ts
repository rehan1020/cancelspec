// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderMethodologyPage(config: ProjectConfig): string {
  const content = `
    <h1>Difficulty Rubric & Verification Methodology</h1>
    <p>CancelSpec calculates difficulty objectively using an open, reproducible rubric. Scores are never subjectively assigned by authors.</p>

    <section aria-labelledby="rubric-heading">
      <h2 id="rubric-heading">Difficulty Rubric v0</h2>
      <p>Points are computed based on the presence of verifiable friction signals in the cancellation process:</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Signal</th>
            <th scope="col">Points Added</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>4 to 6 steps / 7 or more steps</td>
            <td>1 pt / 2 pts</td>
            <td>Length of cancellation funnel</td>
          </tr>
          <tr>
            <td>phone-required</td>
            <td>2 pts</td>
            <td>Must call customer support representative to cancel</td>
          </tr>
          <tr>
            <td>chat-only</td>
            <td>1 pt</td>
            <td>Must initiate a live chat session to cancel</td>
          </tr>
          <tr>
            <td>retention-offer</td>
            <td>1 pt</td>
            <td>Forced discount or retention offer screens before cancel button</td>
          </tr>
          <tr>
            <td>survey-wall</td>
            <td>0.5 pts</td>
            <td>Forced questionnaire required to complete cancellation</td>
          </tr>
          <tr>
            <td>hidden-entry</td>
            <td>1 pt</td>
            <td>Cancel link is concealed, nested in unrelated submenus, or misleadingly labeled</td>
          </tr>
          <tr>
            <td>captcha</td>
            <td>1 pt</td>
            <td>CAPTCHA verification required to complete cancellation</td>
          </tr>
          <tr>
            <td>app-required</td>
            <td>1 pt</td>
            <td>Cannot cancel in browser; mobile app download required</td>
          </tr>
        </tbody>
      </table>

      <h3>Score Bands</h3>
      <p>Raw point totals map directly to difficulty levels 1 to 5:</p>
      <ul>
        <li><strong>Level 1 (Easy):</strong> 0 to 1.0 points</li>
        <li><strong>Level 2 (Moderate):</strong> 1.5 to 2.5 points</li>
        <li><strong>Level 3 (Challenging):</strong> 3.0 to 4.0 points</li>
        <li><strong>Level 4 (High Friction):</strong> 4.5 to 5.5 points</li>
        <li><strong>Level 5 (Severe Friction):</strong> 6.0 or more points</li>
      </ul>
    </section>

    <section aria-labelledby="a11y-heading">
      <h2 id="a11y-heading">Accessibility Rating (accessible_to_cancel)</h2>
      <p>A playbook is marked <code>accessible_to_cancel = false</code> when a service requires a phone call, CAPTCHA, or mobile app to cancel and offers no alternative accessible route. When an alternative accessible path is verified (such as a 24/7 web form or chat alternative), the flag remains <code>true</code>.</p>
    </section>

    <section aria-labelledby="verification-heading">
      <h2 id="verification-heading">Verification Standards</h2>
      <p>Playbook accuracy is maintained through three hierarchical tiers of evidence:</p>
      <ol>
        <li><strong>First-hand verification:</strong> Performed directly by a contributor using an active account or trial.</li>
        <li><strong>Official help page:</strong> Step-by-step documentation published on the service provider's verified official domain.</li>
        <li><strong>Community report:</strong> Independent user reports submitted through public issues.</li>
      </ol>
      <p>Every published playbook records its verification source URL and the exact access date.</p>
    </section>
`;

  return renderLayout({
    title: 'Methodology & Rubric',
    description: 'How CancelSpec computes difficulty scores and verifies cancellation steps objectively.',
    canonicalPath: '/methodology/',
    content,
    config,
  });
}
