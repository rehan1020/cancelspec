// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Cadence, RecurrenceResult, TransactionGroup } from './types.js';

function computeDayIntervals(dates: Date[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const diffMs = dates[i]!.getTime() - dates[i - 1]!.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }
  return intervals;
}

function matchesCadence(
  interval: number,
  cadence: Cadence,
  d1: Date,
  d2: Date,
): boolean {
  switch (cadence) {
    case 'weekly':
      return interval >= 6 && interval <= 8;
    case 'biweekly':
      return interval >= 12 && interval <= 16;
    case 'monthly': {
      if (interval >= 26 && interval <= 35) return true;
      // Day of month +/- 3 days for adjacent calendar months
      const monthDiff =
        (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 +
        (d2.getUTCMonth() - d1.getUTCMonth());
      if (monthDiff === 1 && interval >= 24 && interval <= 36) {
        const domDiff = Math.abs(d1.getUTCDate() - d2.getUTCDate());
        if (domDiff <= 3 || domDiff >= 28) return true;
      }
      return false;
    }
    case 'quarterly':
      return interval >= 85 && interval <= 98;
    case 'semiannual':
      return interval >= 170 && interval <= 195;
    case 'annual':
      return interval >= 355 && interval <= 376;
  }
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function detectRecurrence(
  group: TransactionGroup,
  latestStatementDate: Date,
  hasPlaybookMatch: boolean = false,
): RecurrenceResult | null {
  // Filter only outflow/charges (positive amounts)
  const charges = group.transactions.filter((t) => t.amount > 0);
  if (charges.length === 0) return null;

  // Sort and collapse same-day duplicates
  charges.sort((a, b) => a.date.getTime() - b.date.getTime());
  const uniqueDatesMap = new Map<string, number>(); // YYYY-MM-DD -> amount

  for (const c of charges) {
    const key = c.date.toISOString().split('T')[0]!;
    if (!uniqueDatesMap.has(key)) {
      uniqueDatesMap.set(key, c.amount);
    }
  }

  const distinctDates = Array.from(uniqueDatesMap.keys()).map((k) => new Date(k));
  const distinctAmounts = Array.from(uniqueDatesMap.values());

  const chargeCount = distinctDates.length;

  const hasAnnualKeyword =
    /\b(?:ANNUAL|YEARLY)\b/i.test(group.merchantKey);

  // Special case: Single annual charge matches a playbook or has explicit annual descriptor (Section 6 Stage 7)
  if (chargeCount === 1 && (hasPlaybookMatch || hasAnnualKeyword)) {
    const lastDate = distinctDates[0]!;
    const diffFromLatestDays = Math.round(
      (latestStatementDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      cadence: 'annual',
      regularityScore: 15,
      intervals: [],
      intervalFitRatio: 1.0,
      amountStabilityScore: 25,
      medianAmount: distinctAmounts[0]!,
      chargeCount: 1,
      chargeCountScore: 5,
      lastChargeDate: lastDate,
      isOverdue: diffFromLatestDays > 373 * 1.5,
    };
  }

  if (chargeCount < 2) return null;

  const intervals = computeDayIntervals(distinctDates);
  if (intervals.length === 0) return null;

  // Amount stability check
  const medianAmount = calculateMedian(distinctAmounts);
  let stableAmountsCount = 0;

  for (const amt of distinctAmounts) {
    const diff = Math.abs(amt - medianAmount);
    const threshold = medianAmount < 10 ? 1.0 : medianAmount * 0.1;
    if (diff <= threshold) {
      stableAmountsCount++;
    }
  }

  // Allow one price step (e.g. promotional trial ended or annual price increase)
  const stabilityRatio = stableAmountsCount / distinctAmounts.length;
  const isAmountStable = stabilityRatio >= 0.7 || distinctAmounts.length <= 3;

  // Discard groups with > 3 distinct amounts and high variance (likely retail)
  const uniqueAmountValues = new Set(distinctAmounts.map((a) => a.toFixed(2)));
  if (uniqueAmountValues.size > 3 && stabilityRatio < 0.6) {
    return null;
  }

  const amountStabilityScore = Math.round(stabilityRatio * 25);

  // Cadence test
  const cadences: Cadence[] = [
    'monthly',
    'weekly',
    'biweekly',
    'quarterly',
    'semiannual',
    'annual',
  ];

  let bestCadence: Cadence | null = null;
  let bestFitRatio = 0;

  for (const cadence of cadences) {
    const minRequired = cadence === 'weekly' || cadence === 'biweekly' ? 3 : 2;
    if (chargeCount < minRequired) continue;

    let matchCount = 0;
    for (let i = 0; i < intervals.length; i++) {
      if (matchesCadence(intervals[i]!, cadence, distinctDates[i]!, distinctDates[i + 1]!)) {
        matchCount++;
      }
    }

    const fitRatio = matchCount / intervals.length;
    if (fitRatio >= 0.7 && fitRatio > bestFitRatio) {
      bestFitRatio = fitRatio;
      bestCadence = cadence;
    }
  }

  if (!bestCadence) return null;

  // Regularity score (0 - 35)
  const regularityScore = Math.round(bestFitRatio * 35);

  // Charge count score (0 - 20, capped at 6 charges)
  const chargeCountScore = Math.min(20, Math.round((chargeCount / 6) * 20));

  const lastChargeDate = distinctDates[distinctDates.length - 1]!;

  // Check overdue: > 1.5 cadences relative to latest statement date
  const cadenceDays: Record<Cadence, number> = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 91,
    semiannual: 182,
    annual: 365,
  };
  const nominalInterval = cadenceDays[bestCadence];
  const daysSinceLast = Math.round(
    (latestStatementDate.getTime() - lastChargeDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isOverdue = daysSinceLast > nominalInterval * 1.5;

  return {
    cadence: bestCadence,
    regularityScore,
    intervals,
    intervalFitRatio: bestFitRatio,
    amountStabilityScore: isAmountStable ? amountStabilityScore : 10,
    medianAmount,
    chargeCount,
    chargeCountScore,
    lastChargeDate,
    isOverdue,
  };
}
