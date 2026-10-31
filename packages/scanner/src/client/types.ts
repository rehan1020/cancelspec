// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ColumnMapping, DetectedSubscription, ScanResult } from '../types.js';

export type ScreenState =
  | 'intake'
  | 'mapping'
  | 'scanning'
  | 'results'
  | 'checklist'
  | 'error';

export type SortColumn = 'service' | 'cadence' | 'amount' | 'annual' | 'difficulty';
export type SortDirection = 'asc' | 'desc';

export interface ColumnMappingChoices {
  dateCol: number;
  descCol: number;
  mode: 'single' | 'split';
  amountCol: number;
  debitCol: number;
  creditCol: number;
  isDayFirst: boolean;
  isOutflowPositive: boolean;
  currency: string;
}

export interface ToolState {
  screen: ScreenState;
  fileName: string | null;
  fileText: string | null;
  previewRows: string[][];
  headers: string[];
  mapping: ColumnMapping | null;
  mappingChoices: ColumnMappingChoices | null;
  scanProgress: { stage: string; percent: number };
  scanResult: ScanResult | null;
  excludedSubIds: Set<string>;
  cancelledSubIds: Set<string>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  errorMessage: string | null;
  suggestModalSub: DetectedSubscription | null;
}
