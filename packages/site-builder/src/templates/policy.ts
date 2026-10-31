// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { escapeHtml } from '@cancelspec/ui';
import type { ProjectConfig } from '../config.js';
import { renderLayout } from './layout.js';

export interface PolicyData {
  slug: string;
  title: string;
  bodyHtml: string;
}

export function renderPolicyPage(policy: PolicyData, config: ProjectConfig): string {
  const content = `
    <nav aria-label="Breadcrumb">
      <p><small><a href="/">Home</a> &gt; Policies &gt; ${escapeHtml(policy.title)}</small></p>
    </nav>

    <h1>${escapeHtml(policy.title)}</h1>

    <div class="policy-body">
      ${policy.bodyHtml}
    </div>
`;

  return renderLayout({
    title: policy.title,
    description: `${policy.title} for CancelSpec.`,
    canonicalPath: `/policies/${policy.slug}/`,
    content,
    config,
  });
}
