// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SPEC_VERSION, type CompiledPlaybook } from '@cancelspec/spec';
import { buildAliasIndex, type AliasIndex } from './index_builder.js';

export interface ReleaseBundle {
  specVersion: string;
  dataVersion: string;
  generatedAt: string;
  count: number;
  playbooks: CompiledPlaybook[];
  index: AliasIndex;
}

export interface CreateBundleOptions {
  dataVersion?: string | undefined;
  referenceDate?: Date | undefined;
}

export function sortObjectKeys<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys) as unknown as T;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = sortObjectKeys(obj[key]);
  }
  return result as T;
}

export function serializeDeterministicJson(data: unknown): string {
  const sorted = sortObjectKeys(data);
  return JSON.stringify(sorted, null, 2) + '\n';
}

export function createReleaseBundle(
  playbooks: CompiledPlaybook[],
  options: CreateBundleOptions = {},
): ReleaseBundle {
  const refDate = options.referenceDate || new Date('2026-10-31T00:00:00.000Z');
  const year = refDate.getUTCFullYear();
  const month = String(refDate.getUTCMonth() + 1).padStart(2, '0');
  const defaultVersion = `${year}.${month}.1`;

  // Sort playbooks deterministically
  const sortedPlaybooks = [...playbooks].sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    return a.id.localeCompare(b.id);
  });

  const index = buildAliasIndex(sortedPlaybooks);

  return {
    specVersion: SPEC_VERSION,
    dataVersion: options.dataVersion || defaultVersion,
    generatedAt: refDate.toISOString(),
    count: sortedPlaybooks.length,
    playbooks: sortedPlaybooks,
    index,
  };
}
