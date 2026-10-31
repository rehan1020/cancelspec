// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AliasIndex } from '@cancelspec/core';
import type { MatchedPlaybook } from './types.js';

function computeTokenSetSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function matchMerchantKey(
  merchantKey: string,
  tokens: string[],
  index: AliasIndex,
): MatchedPlaybook[] {
  const matches: MatchedPlaybook[] = [];
  const seenServiceIds = new Set<string>();

  const cleanKey = merchantKey.trim().toUpperCase();

  // 1. Exact match (1.0)
  const exactHits = index.exactMap[cleanKey];
  if (exactHits) {
    for (const entry of exactHits) {
      if (!seenServiceIds.has(entry.serviceId)) {
        seenServiceIds.add(entry.serviceId);
        matches.push({
          serviceId: entry.serviceId,
          serviceName: entry.serviceName,
          region: entry.region,
          category: entry.category,
          matchScore: 1.0,
          entry,
        });
      }
    }
  }

  // 2. Prefix & Wildcard matches (0.9) and Token-set Jaccard matches (>= 0.8)
  for (const entry of index.entries) {
    if (seenServiceIds.has(entry.serviceId)) continue;

    // Wildcard pattern match (e.g. SPOTIFY*)
    if (entry.isWildcard) {
      const prefix = entry.normalizedPattern;
      if (prefix && (cleanKey.startsWith(prefix) || cleanKey.includes(prefix))) {
        seenServiceIds.add(entry.serviceId);
        matches.push({
          serviceId: entry.serviceId,
          serviceName: entry.serviceName,
          region: entry.region,
          category: entry.category,
          matchScore: 0.9,
          entry,
        });
        continue;
      }
    }

    // Token-set Jaccard similarity (>= 0.8)
    const similarity = computeTokenSetSimilarity(tokens, entry.tokens);
    if (similarity >= 0.8) {
      seenServiceIds.add(entry.serviceId);
      matches.push({
        serviceId: entry.serviceId,
        serviceName: entry.serviceName,
        region: entry.region,
        category: entry.category,
        matchScore: Math.round(similarity * 100) / 100,
        entry,
      });
    }
  }

  // Sort matches by matchScore descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}
