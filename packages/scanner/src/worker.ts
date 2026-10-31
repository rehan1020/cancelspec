// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AliasIndex } from '@cancelspec/core/index_builder';
import { scoreColumnMapping } from './column_mapping.js';
import { scanStatement, type ScanOptions } from './engine.js';
import { parseStatementIntake } from './intake.js';
import type { ColumnMapping, ScanResult } from './types.js';

export type WorkerInMessage =
  | { type: 'SCAN_START'; text: string; options?: ScanOptions | undefined }
  | { type: 'CONTINUE_WITH_MAPPING'; text: string; mapping: ColumnMapping; options?: ScanOptions | undefined }
  | { type: 'RESET' };

export type WorkerOutMessage =
  | { type: 'SCAN_PROGRESS'; stage: string; percent: number }
  | {
      type: 'MAPPING_REQUIRED';
      headers: string[];
      previewRows: string[][];
      suggestedMapping: ColumnMapping;
    }
  | { type: 'SCAN_COMPLETE'; result: ScanResult }
  | { type: 'SCAN_ERROR'; error: string };

export function setupWorkerHandler(
  postMsg: (msg: WorkerOutMessage) => void,
  getIndex?: (() => AliasIndex | undefined) | undefined,
): (e: { data: WorkerInMessage }) => void {
  return function handleMessage(e: { data: WorkerInMessage }) {
    const msg = e.data;
    if (!msg) return;

    if (msg.type === 'RESET') {
      // Worker state is clean per turn
      return;
    }

    if (msg.type === 'SCAN_START') {
      try {
        const table = parseStatementIntake(msg.text, msg.options?.explicitDelimiter);
        const mapping = scoreColumnMapping(table.headers, table.rows);

        // If mapping confidence < 0.8 and no explicit mapping provided, request user mapping
        if (mapping.confidence < 0.8 && !msg.options?.columnMapping) {
          postMsg({
            type: 'MAPPING_REQUIRED',
            headers: table.headers,
            previewRows: table.rows.slice(0, 5),
            suggestedMapping: mapping,
          });
          return;
        }

        const fallbackIndex = getIndex ? getIndex() : undefined;
        const result = scanStatement(msg.text, {
          ...msg.options,
          aliasIndex: msg.options?.aliasIndex || fallbackIndex,
          onProgress: (p) => {
            postMsg({ type: 'SCAN_PROGRESS', stage: p.stage, percent: p.percent });
          },
        });

        postMsg({ type: 'SCAN_COMPLETE', result });
      } catch (err) {
        // Plain-language error; never echo file content
        postMsg({
          type: 'SCAN_ERROR',
          error: (err as Error).message || 'Failed to process statement file.',
        });
      }
    } else if (msg.type === 'CONTINUE_WITH_MAPPING') {
      try {
        const fallbackIndex = getIndex ? getIndex() : undefined;
        const result = scanStatement(msg.text, {
          ...msg.options,
          columnMapping: msg.mapping,
          aliasIndex: msg.options?.aliasIndex || fallbackIndex,
          onProgress: (p) => {
            postMsg({ type: 'SCAN_PROGRESS', stage: p.stage, percent: p.percent });
          },
        });

        postMsg({ type: 'SCAN_COMPLETE', result });
      } catch (err) {
        postMsg({
          type: 'SCAN_ERROR',
          error: (err as Error).message || 'Failed to process statement file.',
        });
      }
    }
  };
}

// If in browser web worker environment
if (typeof self !== 'undefined' && typeof (self as unknown as Worker).postMessage === 'function') {
  const handler = setupWorkerHandler((msg) => self.postMessage(msg));
  self.addEventListener('message', handler as unknown as EventListener);
}
