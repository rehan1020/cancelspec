// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Channel, Outcome, PlaybookKind } from '@cancelspec/spec';
import type { IndexEntry } from '@cancelspec/core/index_builder';

export type Cadence =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export interface ParsedTransaction {
  date: Date;
  rawDescription: string;
  merchantKey: string;
  processorHint?: Channel | undefined;
  amount: number; // positive = outflow (charge), negative = inflow (credit)
  currency: string;
  originalRowIndex: number;
}

export interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol?: number | undefined;
  debitCol?: number | undefined;
  creditCol?: number | undefined;
  confidence: number;
}

export interface TransactionGroup {
  merchantKey: string;
  tokens: string[];
  processorHint?: Channel | undefined;
  currency: string;
  transactions: ParsedTransaction[];
}

export interface RecurrenceResult {
  cadence: Cadence;
  regularityScore: number; // 0-35
  intervals: number[];
  intervalFitRatio: number;
  amountStabilityScore: number; // 0-25
  medianAmount: number;
  chargeCount: number;
  chargeCountScore: number; // 0-20
  lastChargeDate: Date;
  isOverdue: boolean;
}

export interface MatchedPlaybook {
  serviceId: string;
  serviceName: string;
  region: string;
  category: string;
  difficulty?: number | undefined;
  matchScore: number; // 0.8 - 1.0
  entry?: IndexEntry | undefined;
  outcome?: Outcome | undefined;
  kind?: PlaybookKind | undefined;
}

export interface DetectedSubscription {
  id: string; // unique scan item id
  merchantKey: string;
  cadence: Cadence;
  typicalAmount: number;
  annualizedCost: number;
  currency: string;
  chargeCount: number;
  firstDate: string;
  lastDate: string;
  confidenceScore: number; // 0 - 100
  tier: 'likely' | 'possible';
  isOverdue: boolean;
  processorHint?: Channel | undefined;
  matches: MatchedPlaybook[];
  topMatch?: MatchedPlaybook | undefined;
  transactions: Array<{ date: string; amount: number }>;
}

export interface ScanResult {
  subscriptions: DetectedSubscription[];
  currencyTotals: Record<string, { totalAnnualized: number; count: number }>;
  totalRowsProcessed: number;
  durationMs: number;
}

export interface ScannerProgress {
  stage: string;
  percent: number;
}
