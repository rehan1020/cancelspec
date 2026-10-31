// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { normalizeMerchant } from '@cancelspec/core/normalize';
import type { ParsedTransaction, TransactionGroup } from './types.js';

function computeJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const t of setA) {
    if (setB.has(t)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function isPrefixMatch(keyA: string, keyB: string): boolean {
  if (keyA.length < 6 && keyB.length < 6) return false;
  return keyA.startsWith(keyB) || keyB.startsWith(keyA);
}

export function groupAndMergeTransactions(
  transactions: ParsedTransaction[],
): TransactionGroup[] {
  // Step 1: Group by exact normalized merchant key and currency
  const exactGroups = new Map<string, TransactionGroup>();

  for (const tx of transactions) {
    if (!tx.merchantKey) continue;
    const groupKey = `${tx.currency}:::${tx.merchantKey}`;

    let grp = exactGroups.get(groupKey);
    if (!grp) {
      const norm = normalizeMerchant(tx.rawDescription);
      grp = {
        merchantKey: tx.merchantKey,
        tokens: norm.tokens,
        processorHint: tx.processorHint,
        currency: tx.currency,
        transactions: [],
      };
      exactGroups.set(groupKey, grp);
    }
    grp.transactions.push(tx);
  }

  const rawGroupList = Array.from(exactGroups.values());

  // Step 2: Merge groups within the same currency if token-set similarity >= 0.8 or prefix match
  const mergedGroups: TransactionGroup[] = [];
  const mergedIndices = new Set<number>();

  for (let i = 0; i < rawGroupList.length; i++) {
    if (mergedIndices.has(i)) continue;

    const baseGroup = rawGroupList[i]!;
    mergedIndices.add(i);

    for (let j = i + 1; j < rawGroupList.length; j++) {
      if (mergedIndices.has(j)) continue;

      const candidate = rawGroupList[j]!;
      // Never merge across currencies
      if (baseGroup.currency !== candidate.currency) continue;

      const sim = computeJaccardSimilarity(baseGroup.tokens, candidate.tokens);
      const prefix = isPrefixMatch(baseGroup.merchantKey, candidate.merchantKey);

      if (sim >= 0.8 || prefix) {
        // Merge candidate into baseGroup
        baseGroup.transactions.push(...candidate.transactions);
        if (!baseGroup.processorHint && candidate.processorHint) {
          baseGroup.processorHint = candidate.processorHint;
        }
        mergedIndices.add(j);
      }
    }

    // Sort transactions chronologically
    baseGroup.transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    mergedGroups.push(baseGroup);
  }

  return mergedGroups;
}
