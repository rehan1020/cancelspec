// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { CompiledPlaybook } from '@cancelspec/spec';
import { normalizeMerchant } from './normalize.js';

export interface IndexEntry {
  pattern: string;
  normalizedPattern: string;
  serviceId: string;
  region: string;
  serviceName: string;
  category: string;
  isWildcard: boolean;
  tokens: string[];
}

export interface AliasIndex {
  entries: IndexEntry[];
  exactMap: Record<string, IndexEntry[]>;
}

export function buildAliasIndex(playbooks: CompiledPlaybook[]): AliasIndex {
  const entries: IndexEntry[] = [];
  const exactMap: Record<string, IndexEntry[]> = {};

  function addEntry(
    rawPattern: string,
    playbook: CompiledPlaybook,
    isWildcard: boolean,
  ) {
    const cleanPattern = rawPattern.replace(/\*+$/, '').trim();
    const normalized = normalizeMerchant(cleanPattern).merchantKey;
    const tokens = normalized.split(/\s+/).filter(Boolean);

    const entry: IndexEntry = {
      pattern: rawPattern,
      normalizedPattern: normalized,
      serviceId: playbook.id,
      region: playbook.region,
      serviceName: playbook.name,
      category: playbook.category,
      isWildcard,
      tokens,
    };

    entries.push(entry);

    if (normalized) {
      if (!exactMap[normalized]) {
        exactMap[normalized] = [];
      }
      exactMap[normalized].push(entry);
    }
  }

  for (const playbook of playbooks) {
    // 1. Service name
    addEntry(playbook.name, playbook, false);

    // 2. Service id
    addEntry(playbook.id.replace(/-/g, ' '), playbook, false);

    // 3. Aliases
    if (playbook.aliases) {
      for (const alias of playbook.aliases) {
        addEntry(alias, playbook, false);
      }
    }

    // 4. Merchant patterns
    for (const pattern of playbook.merchant_patterns) {
      const isWildcard = pattern.endsWith('*');
      addEntry(pattern, playbook, isWildcard);
    }
  }

  // Sort entries deterministically
  entries.sort((a, b) => {
    if (a.normalizedPattern !== b.normalizedPattern) {
      return a.normalizedPattern.localeCompare(b.normalizedPattern);
    }
    if (a.region !== b.region) {
      return a.region.localeCompare(b.region);
    }
    return a.serviceId.localeCompare(b.serviceId);
  });

  return { entries, exactMap };
}
