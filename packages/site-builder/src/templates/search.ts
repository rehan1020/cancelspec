// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { CompiledPlaybook } from '@cancelspec/spec';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderSearchPage(
  playbooks: CompiledPlaybook[],
  config: ProjectConfig,
): string {
  const serviceList = playbooks
    .map(
      (p) =>
        `<li><a href="/services/${p.region.toLowerCase()}/${p.id}/">${escapeHtml(p.name)} (${escapeHtml(p.region)})</a> - <small>${escapeHtml(p.category)}</small></li>`,
    )
    .join('\n');

  const content = `
    <h1>Search Subscriptions</h1>

    <div class="card">
      <label for="search-input" class="sr-only">Type a service name</label>
      <input type="search" id="search-input" placeholder="Type a service or alias..." autocomplete="off">
    </div>

    <div id="search-results-container" aria-live="polite">
      <h2>All Services (Static Fallback)</h2>
      <p><small>Search index runs client-side. If JavaScript is disabled, you can browse all services below:</small></p>
      <ul>
        ${serviceList}
      </ul>
    </div>

    <script type="module">
      const input = document.getElementById('search-input');
      const container = document.getElementById('search-results-container');

      fetch('/search-index.json')
        .then(res => res.json())
        .then(data => {
          input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (!query) {
              return;
            }
            const matches = data.filter(s =>
              s.name.toLowerCase().includes(query) ||
              s.id.toLowerCase().includes(query) ||
              (s.aliases && s.aliases.some(a => a.toLowerCase().includes(query)))
            );

            if (matches.length === 0) {
              container.innerHTML = '<p>No matching services found.</p>';
              return;
            }

            const list = document.createElement('ul');
            matches.forEach(m => {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = '/services/' + m.region.toLowerCase() + '/' + m.id + '/';
              a.textContent = m.name + ' (' + m.region + ')';
              li.appendChild(a);
              list.appendChild(li);
            });

            while (container.firstChild) container.removeChild(container.firstChild);
            const heading = document.createElement('h2');
            heading.textContent = 'Search Results (' + matches.length + ')';
            container.appendChild(heading);
            container.appendChild(list);
          });
        })
        .catch(() => {});
    </script>
`;

  return renderLayout({
    title: 'Search Services',
    description: 'Search for subscription cancellation instructions.',
    canonicalPath: '/search/',
    content,
    config,
  });
}
