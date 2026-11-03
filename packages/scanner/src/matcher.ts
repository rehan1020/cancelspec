// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AliasIndex, IndexEntry } from '@cancelspec/core/index_builder';
import type { Channel } from '@cancelspec/spec';
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

export function matchesWordBoundary(text: string, pattern: string): boolean {
  if (!text || !pattern) return false;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\b|\\s)${escaped}(\\b|\\s|$)`, 'i');
  return regex.test(text);
}

interface InternalMatch extends MatchedPlaybook {
  isExact: boolean;
  literalLength: number;
}

function compareMatches(a: InternalMatch, b: InternalMatch): number {
  // 1. Channel guides match last (fallback hint)
  const aIsGuide = a.entry?.kind === 'channel-guide' ? 1 : 0;
  const bIsGuide = b.entry?.kind === 'channel-guide' ? 1 : 0;
  if (aIsGuide !== bIsGuide) {
    return aIsGuide - bIsGuide;
  }

  // 2. Exact match beats prefix/fuzzy
  const aExact = a.isExact ? 1 : 0;
  const bExact = b.isExact ? 1 : 0;
  if (aExact !== bExact) {
    return bExact - aExact;
  }

  // 3. Longer literal text beats shorter
  const aLen = a.literalLength;
  const bLen = b.literalLength;
  if (aLen !== bLen) {
    return bLen - aLen;
  }

  // 4. Higher match score
  if (b.matchScore !== a.matchScore) {
    return b.matchScore - a.matchScore;
  }

  // 5. Deterministic tie-breaker
  return a.serviceId.localeCompare(b.serviceId);
}

const PROCESSOR_TO_CHANNEL_GUIDE_ID: Record<string, string> = {
  apple: 'apple-subscriptions',
  'google-play': 'google-play',
  paypal: 'paypal',
};

export function matchMerchantKey(
  merchantKey: string,
  tokens: string[],
  index: AliasIndex,
  processorHint?: Channel,
): MatchedPlaybook[] {
  const cleanKey = merchantKey.trim().toUpperCase();
  if (!cleanKey && !processorHint) return [];

  const candidateMap = new Map<string, InternalMatch>();

  function considerMatch(entry: IndexEntry, matchScore: number, isExact: boolean) {
    const literalLength = entry.literalLength || entry.pattern.replace(/\*/g, '').trim().length;
    const cand: InternalMatch = {
      serviceId: entry.serviceId,
      serviceName: entry.serviceName,
      region: entry.region,
      category: entry.category,
      difficulty: entry.difficulty,
      outcome: entry.outcome,
      kind: entry.kind,
      matchScore,
      entry,
      isExact,
      literalLength,
    };

    const existing = candidateMap.get(entry.serviceId);
    if (!existing || compareMatches(cand, existing) < 0) {
      candidateMap.set(entry.serviceId, cand);
    }
  }

  if (cleanKey) {
    for (const entry of index.entries) {
      // 1. Exact match (1.0)
      if (cleanKey === entry.normalizedPattern || cleanKey === entry.literalText) {
        considerMatch(entry, 1.0, true);
        continue;
      }

      // 2. Prefix & Wildcard matches on word boundaries (0.9)
      if (entry.isWildcard) {
        const prefix = entry.normalizedPattern;
        const lit = entry.literalText;
        if (
          (prefix && matchesWordBoundary(cleanKey, prefix)) ||
          (lit && matchesWordBoundary(cleanKey, lit))
        ) {
          considerMatch(entry, 0.9, false);
          continue;
        }
      }

      // 3. Token-set Jaccard similarity (>= 0.8)
      const similarity = computeTokenSetSimilarity(tokens, entry.tokens);
      if (similarity >= 0.8) {
        considerMatch(entry, Math.round(similarity * 100) / 100, false);
      }
    }
  }

  // 4. Channel guide matching for processor hints (attached as fallback)
  if (processorHint && PROCESSOR_TO_CHANNEL_GUIDE_ID[processorHint]) {
    const guideId = PROCESSOR_TO_CHANNEL_GUIDE_ID[processorHint];
    const guideEntry = index.entries.find((e) => e.serviceId === guideId && e.kind === 'channel-guide');
    if (guideEntry) {
      considerMatch(guideEntry, 0.85, false);
    }
  }

  const results = Array.from(candidateMap.values());
  results.sort(compareMatches);

  return results.map(({ isExact, literalLength, ...m }) => m);
}
