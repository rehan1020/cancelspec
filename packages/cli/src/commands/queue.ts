// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { loadAllPlaybooks } from '@cancelspec/core';

export interface VerificationItem {
  id: string;
  name: string;
  region: string;
  category: string;
  sources: Array<{ url: string; accessed_on: string; sha256?: string }>;
  openQuestions: string[];
}

export function getVerificationQueue(playbooksDir: string): VerificationItem[] {
  const playbooks = loadAllPlaybooks(playbooksDir, { includeDrafts: true });
  const drafts = playbooks.filter((p) => p.status === 'draft');

  return drafts.map((p) => {
    const openQuestions: string[] = [];

    if (!p.reviewers || p.reviewers.length === 0) {
      openQuestions.push('Awaiting human reviewer confirmation');
    }
    if (p.contributors.includes('ai-draft')) {
      openQuestions.push('Drafted by automated agent (needs human step-by-step audit)');
    }
    if (!p.merchant_patterns || p.merchant_patterns.length === 0) {
      openQuestions.push('No statement descriptors sourced yet (merchant_patterns is empty)');
    }
    if (!p.verified_on || p.verified_on.includes('TODO')) {
      openQuestions.push('Missing verified_on date');
    }
    if (!p.verification_method || p.verification_method.includes('TODO')) {
      openQuestions.push('Missing verification_method');
    }
    if (p.sources.some((s) => !s.sha256)) {
      openQuestions.push('One or more sources lack SHA-256 digest');
    }

    return {
      id: p.id,
      name: p.name,
      region: p.region,
      category: p.category,
      sources: p.sources,
      openQuestions,
    };
  });
}

export function printVerificationQueue(playbooksDir: string): void {
  const queue = getVerificationQueue(playbooksDir);

  console.log(`\n========================================`);
  console.log(`   CancelSpec Human Verification Queue  `);
  console.log(`========================================\n`);
  console.log(`Total drafts awaiting human verification: ${queue.length}\n`);

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]!;
    console.log(`[${i + 1}] ${item.name} (${item.region}/${item.id}) - Category: ${item.category}`);
    console.log(`    Sources:`);
    for (const src of item.sources) {
      const hashStr = src.sha256 ? ` (SHA-256: ${src.sha256.slice(0, 12)}...)` : ' (no hash)';
      console.log(`      - ${src.url} [Accessed: ${src.accessed_on}]${hashStr}`);
    }
    console.log(`    Open Questions & Action Items:`);
    for (const q of item.openQuestions) {
      console.log(`      * ${q}`);
    }
    console.log('');
  }
}
