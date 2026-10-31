// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export function renderHomePage(config: ProjectConfig, serviceCount: number): string {
  const content = `
    <div class="hero-box">
      <h1>${escapeHtml(config.site.tagline)}</h1>
      <p>A free, open-source, browser-only tool and community dataset to cancel unwanted subscriptions.</p>
      <div class="banner banner-warning">
        <strong>Privacy Promise:</strong> No data leaves your device. Zero network requests during or after a scan. Nothing is ever stored or tracked.
      </div>
    </div>

    <section aria-labelledby="search-heading">
      <h2 id="search-heading">Find a Subscription</h2>
      <form action="/search/" method="get" class="search-form" role="search">
        <label for="home-search" class="sr-only">Search subscriptions</label>
        <div style="display: flex; gap: 0.5rem; max-width: 500px; margin: 1rem 0;">
          <input type="search" id="home-search" name="q" placeholder="Search Netflix, Spotify, gym..." required autocomplete="off">
          <button type="submit" class="btn btn-primary">Search</button>
        </div>
      </form>
    </section>

    <section aria-labelledby="paths-heading">
      <h2 id="paths-heading">Choose Your Path</h2>
      <div class="two-paths">
        <div class="path-box">
          <div>
            <h3>Scan Bank Statement</h3>
            <p>Drop in a bank statement (CSV or TSV) to automatically discover recurring subscriptions.</p>
            <p><small>Runs 100% inside your browser Web Worker. No files or data ever leave your device.</small></p>
          </div>
          <div style="margin-top: 1rem;">
            <a href="/tool/" class="btn btn-primary" style="width: 100%;">Use In-Browser Scanner</a>
          </div>
        </div>

        <div class="path-box">
          <div>
            <h3>Pick Services by Hand</h3>
            <p>Browse our directory of ${serviceCount} community-verified step-by-step cancellation playbooks.</p>
            <p><small>Works completely without JavaScript. Clear instructions, direct links, and friction alerts.</small></p>
          </div>
          <div style="margin-top: 1rem;">
            <a href="/services/" class="btn" style="width: 100%;">Browse All Services</a>
          </div>
        </div>
      </div>
    </section>
`;

  return renderLayout({
    title: config.site.tagline,
    description: config.project.description,
    canonicalPath: '/',
    content,
    config,
  });
}
