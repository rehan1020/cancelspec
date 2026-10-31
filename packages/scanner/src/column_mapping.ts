// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { parseFlexibleAmount } from './amounts.js';
import { parseFlexibleDate } from './dates.js';
import type { ColumnMapping } from './types.js';

export function scoreColumnMapping(
  headers: string[],
  rows: string[][],
): ColumnMapping {
  const sample = rows.slice(0, 100);
  const colCount = Math.max(headers.length, ...sample.map((r) => r.length));

  if (colCount < 2 || sample.length === 0) {
    return {
      dateCol: 0,
      descCol: 1,
      confidence: 0,
    };
  }

  // Scores per column
  const dateScores = new Array(colCount).fill(0);
  const amountScores = new Array(colCount).fill(0);
  const textLengths = new Array(colCount).fill(0);

  for (const row of sample) {
    for (let c = 0; c < colCount; c++) {
      const val = (row[c] || '').trim();
      if (!val) continue;

      if (parseFlexibleDate(val)) {
        dateScores[c]++;
      }
      if (parseFlexibleAmount(val) !== null) {
        amountScores[c]++;
      }
      textLengths[c] += val.length;
    }
  }

  const sampleSize = sample.length;

  // Best date column: >= 70% match
  let bestDateCol = -1;
  let maxDateRatio = 0;
  for (let c = 0; c < colCount; c++) {
    const ratio = dateScores[c] / sampleSize;
    if (ratio > maxDateRatio && ratio >= 0.7) {
      maxDateRatio = ratio;
      bestDateCol = c;
    }
  }

  // Check header names for hints
  let debitCol: number | undefined;
  let creditCol: number | undefined;
  let singleAmountCol: number | undefined;

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower.includes('debit') || lower.includes('withdrawal') || lower.includes('outflow')) {
      debitCol = idx;
    } else if (lower.includes('credit') || lower.includes('deposit') || lower.includes('inflow')) {
      creditCol = idx;
    } else if (lower.includes('amount') || lower.includes('betrag') || lower.includes('montant')) {
      singleAmountCol = idx;
    }
  });

  // If no debit/credit pair from headers, find best amount column by numeric ratio
  if (debitCol === undefined && creditCol === undefined) {
    let maxAmtRatio = 0;
    for (let c = 0; c < colCount; c++) {
      if (c === bestDateCol) continue;
      const ratio = amountScores[c] / sampleSize;
      if (ratio > maxAmtRatio && ratio >= 0.6) {
        maxAmtRatio = ratio;
        singleAmountCol = c;
      }
    }
  }

  // Best description column: longest average text excluding date and amount columns
  let bestDescCol = -1;
  let maxAvgLen = 0;
  for (let c = 0; c < colCount; c++) {
    if (c === bestDateCol || c === singleAmountCol || c === debitCol || c === creditCol) {
      continue;
    }
    const avgLen = textLengths[c] / sampleSize;
    if (avgLen > maxAvgLen) {
      maxAvgLen = avgLen;
      bestDescCol = c;
    }
  }

  // Fallbacks if not detected
  if (bestDateCol === -1) bestDateCol = 0;
  if (bestDescCol === -1) bestDescCol = 1;
  if (singleAmountCol === undefined && debitCol === undefined) {
    singleAmountCol = colCount > 2 ? 2 : 1;
  }

  // Confidence calculation
  let confidence = 0.5;
  if (maxDateRatio >= 0.8) confidence += 0.25;
  if (singleAmountCol !== undefined || (debitCol !== undefined && creditCol !== undefined)) {
    confidence += 0.25;
  }

  return {
    dateCol: bestDateCol,
    descCol: bestDescCol,
    amountCol: singleAmountCol,
    debitCol,
    creditCol,
    confidence: Math.min(1.0, confidence),
  };
}
