// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Cadence, DetectedSubscription } from './types.js';

export const CADENCE_PERIODS_PER_YEAR: Record<Cadence, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

export function computeAnnualizedCost(amount: number, cadence: Cadence): number {
  const periods = CADENCE_PERIODS_PER_YEAR[cadence];
  return Math.round(amount * periods * 100) / 100;
}

export function compileOutputSubscriptions(
  subscriptions: DetectedSubscription[],
): {
  sortedSubscriptions: DetectedSubscription[];
  currencyTotals: Record<string, { totalAnnualized: number; count: number }>;
} {
  // Sort by annualized cost descending
  const sorted = [...subscriptions].sort((a, b) => b.annualizedCost - a.annualizedCost);

  const currencyTotals: Record<string, { totalAnnualized: number; count: number }> = {};

  for (const sub of sorted) {
    if (!currencyTotals[sub.currency]) {
      currencyTotals[sub.currency] = { totalAnnualized: 0, count: 0 };
    }
    const curr = currencyTotals[sub.currency]!;
    curr.totalAnnualized = Math.round((curr.totalAnnualized + sub.annualizedCost) * 100) / 100;
    curr.count++;
  }

  return {
    sortedSubscriptions: sorted,
    currencyTotals,
  };
}
