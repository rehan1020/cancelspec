// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AliasIndex } from '@cancelspec/core/index_builder';
import { normalizeMerchant } from '@cancelspec/core/normalize';
import { parseFlexibleAmount } from './amounts.js';
import { scoreColumnMapping } from './column_mapping.js';
import { computeConfidenceScore } from './confidence.js';
import { inferDayFirst, parseFlexibleDate } from './dates.js';
import { groupAndMergeTransactions } from './grouping.js';
import { parseStatementIntake } from './intake.js';
import { matchMerchantKey } from './matcher.js';
import { compileOutputSubscriptions, computeAnnualizedCost } from './output.js';
import { detectRecurrence } from './recurrence.js';
import type {
  ColumnMapping,
  DetectedSubscription,
  ParsedTransaction,
  ScannerProgress,
  ScanResult,
} from './types.js';

export interface ScanOptions {
  explicitDelimiter?: string | undefined;
  isDayFirst?: boolean | undefined;
  isOutflowPositive?: boolean | undefined;
  columnMapping?: ColumnMapping | undefined;
  aliasIndex?: AliasIndex | undefined;
  currency?: string | undefined;
  onProgress?: ((progress: ScannerProgress) => void) | undefined;
}

export function scanStatement(
  text: string,
  options: ScanOptions = {},
): ScanResult {
  const startTime = Date.now();
  options.onProgress?.({ stage: 'Parsing statement format', percent: 10 });

  // 1. Stage 1: Intake
  const table = parseStatementIntake(text, options.explicitDelimiter);
  options.onProgress?.({ stage: 'Analyzing columns', percent: 20 });

  // 2. Stage 2: Column mapping
  const mapping =
    options.columnMapping || scoreColumnMapping(table.headers, table.rows);

  // 3. Stage 3 & 4: Date and Amount Parsing
  const rawDates = table.rows
    .map((r) => r[mapping.dateCol] || '')
    .filter(Boolean);
  const dayFirst =
    options.isDayFirst !== undefined
      ? options.isDayFirst
      : inferDayFirst(rawDates);

  // Infer polarity / sign convention for single amount column
  let outflowPositive = options.isOutflowPositive;
  if (
    outflowPositive === undefined &&
    (mapping.debitCol === undefined || mapping.creditCol === undefined)
  ) {
    const amtCol = mapping.amountCol !== undefined ? mapping.amountCol : 2;
    let negCount = 0;
    let posCount = 0;
    for (const row of table.rows) {
      const raw = row[amtCol];
      if (!raw) continue;
      const val = parseFlexibleAmount(raw);
      if (val !== null && val !== 0) {
        if (val < 0) negCount++;
        else posCount++;
      }
    }
    // If majority of amounts are negative, charges are negative (outflowPositive = false)
    outflowPositive = negCount <= posCount;
  }

  const transactions: ParsedTransaction[] = [];
  let latestDate = new Date(0);

  const defaultCurrency = options.currency || 'USD';

  for (let idx = 0; idx < table.rows.length; idx++) {
    const row = table.rows[idx]!;
    const rawDateStr = row[mapping.dateCol] || '';
    const rawDesc = row[mapping.descCol] || '';

    const date = parseFlexibleDate(rawDateStr, dayFirst);
    if (!date) continue;

    if (date.getTime() > latestDate.getTime()) {
      latestDate = date;
    }

    let amount = 0;
    if (mapping.debitCol !== undefined && mapping.creditCol !== undefined) {
      const debitRaw = row[mapping.debitCol] || '';
      const creditRaw = row[mapping.creditCol] || '';

      const debitVal = parseFlexibleAmount(debitRaw);
      const creditVal = parseFlexibleAmount(creditRaw);

      if (debitVal !== null && Math.abs(debitVal) > 0) {
        amount = Math.abs(debitVal); // Outflow
      } else if (creditVal !== null && Math.abs(creditVal) > 0) {
        amount = -Math.abs(creditVal); // Inflow
      } else {
        continue;
      }
    } else {
      const amtCol = mapping.amountCol !== undefined ? mapping.amountCol : 2;
      const rawAmt = row[amtCol] || '';
      const parsedAmt = parseFlexibleAmount(rawAmt);
      if (parsedAmt === null) continue;
      amount = outflowPositive ? parsedAmt : -parsedAmt;
    }

    const norm = normalizeMerchant(rawDesc);
    const merchantKey = norm.merchantKey || (norm.processorHint ? norm.processorHint.toUpperCase() : '');
    if (!merchantKey) continue;

    transactions.push({
      date,
      rawDescription: rawDesc,
      merchantKey,
      processorHint: norm.processorHint,
      amount,
      currency: defaultCurrency,
      originalRowIndex: idx,
    });
  }

  options.onProgress?.({ stage: 'Grouping and merging transactions', percent: 45 });

  // 4. Stage 5 & 6: Group & Merge
  const groups = groupAndMergeTransactions(transactions);

  options.onProgress?.({ stage: 'Detecting recurring subscriptions', percent: 70 });

  const rawSubscriptions: DetectedSubscription[] = [];
  let subIndex = 1;

  for (const group of groups) {
    // Check if group matches an alias in index
    const matches = options.aliasIndex
      ? matchMerchantKey(group.merchantKey, group.tokens, options.aliasIndex, group.processorHint)
      : [];

    const hasPlaybookMatch = matches.length > 0;

    // 5. Stage 7: Recurrence
    const recurrence = detectRecurrence(group, latestDate, hasPlaybookMatch);
    if (!recurrence) continue;

    // 6. Stage 8: Confidence
    const confidence = computeConfidenceScore(recurrence, hasPlaybookMatch);
    if (confidence.tier === 'hidden') continue;

    // 7. Stage 10: Output
    const annualizedCost = computeAnnualizedCost(
      recurrence.medianAmount,
      recurrence.cadence,
    );

    const txDates = group.transactions.map((t) => ({
      date: t.date.toISOString().split('T')[0]!,
      amount: t.amount,
    }));

    rawSubscriptions.push({
      id: `sub-${subIndex++}`,
      merchantKey: group.merchantKey,
      cadence: recurrence.cadence,
      typicalAmount: recurrence.medianAmount,
      annualizedCost,
      currency: group.currency,
      chargeCount: recurrence.chargeCount,
      firstDate: txDates[0]?.date || '',
      lastDate: txDates[txDates.length - 1]?.date || '',
      confidenceScore: confidence.score,
      tier: confidence.tier,
      isOverdue: recurrence.isOverdue,
      processorHint: group.processorHint,
      matches,
      topMatch: matches[0],
      transactions: txDates,
    });
  }

  options.onProgress?.({ stage: 'Compiling results', percent: 95 });

  const { sortedSubscriptions, currencyTotals } = compileOutputSubscriptions(rawSubscriptions);

  options.onProgress?.({ stage: 'Complete', percent: 100 });

  return {
    subscriptions: sortedSubscriptions,
    currencyTotals,
    totalRowsProcessed: table.rows.length,
    durationMs: Date.now() - startTime,
  };
}
