// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { loadAllPlaybooks } from '@cancelspec/core';
import {
  fetchSource,
  getUserAgent,
  type FetchSourceResult,
} from '../utils/fetch_source.js';

export interface RecheckOptions {
  quiet?: boolean | undefined;
  userAgent?: string | undefined;
  failedHosts?: Set<string> | undefined;
  cache?: Map<string, FetchSourceResult> | undefined;
  timeoutMs?: number | undefined;
}

export interface RecheckResult {
  totalPlaybooks: number;
  totalSources: number;
  unchangedCount: number;
  changedCount: number;
  failedCount: number;
  skippedCount: number;
  changes: Array<{
    url: string;
    playbookId: string;
    storedHash: string;
    currentHash: string;
    accessedOn?: string | undefined;
    fetchDate: string;
  }>;
  failures: Array<{
    url: string;
    playbookIds: string[];
    error: string;
  }>;
}

export async function recheckAllSources(
  playbooksDir: string,
  options: RecheckOptions = {},
): Promise<RecheckResult> {
  const allPlaybooks = loadAllPlaybooks(playbooksDir, { includeDrafts: true });
  const failedHosts = options.failedHosts || new Set<string>();
  const userAgent = options.userAgent || getUserAgent();
  const cache = options.cache || new Map<string, FetchSourceResult>();

  // Group by unique source URL
  const sourcesByUrl = new Map<
    string,
    Array<{ playbookId: string; storedHash: string; accessedOn?: string | undefined }>
  >();

  for (const pb of allPlaybooks) {
    for (const src of pb.sources || []) {
      if (src.retrieval === 'manual') continue;
      if (!sourcesByUrl.has(src.url)) {
        sourcesByUrl.set(src.url, []);
      }
      sourcesByUrl.get(src.url)!.push({
        playbookId: pb.id,
        storedHash: src.sha256 || '',
        accessedOn: src.accessed_on,
      });
    }
  }

  const result: RecheckResult = {
    totalPlaybooks: allPlaybooks.length,
    totalSources: sourcesByUrl.size,
    unchangedCount: 0,
    changedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    changes: [],
    failures: [],
  };

  if (!options.quiet) {
    console.log(`\nRechecking ${sourcesByUrl.size} source URLs across ${allPlaybooks.length} playbooks...\n`);
  }

  for (const [url, refs] of sourcesByUrl.entries()) {
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = '';
    }

    if (failedHosts.has(hostname)) {
      result.skippedCount++;
      result.failures.push({
        url,
        playbookIds: refs.map((r) => r.playbookId),
        error: `Host ${hostname} was previously marked as failed or disallowed`,
      });
      if (!options.quiet) {
        console.log(`[SKIPPED] ${url} (host ${hostname} previously failed)`);
      }
      continue;
    }

    let fetchRes: FetchSourceResult | null = null;
    try {
      fetchRes = await fetchSource(url, {
        userAgent,
        failedHosts,
        cache,
        timeoutMs: options.timeoutMs,
      });
    } catch (err) {
      result.failedCount++;
      const msg = (err as Error).message;
      result.failures.push({
        url,
        playbookIds: refs.map((r) => r.playbookId),
        error: msg,
      });
      if (!options.quiet) {
        console.log(`[FAILED]  ${url}: ${msg}`);
      }
      continue;
    }

    for (const ref of refs) {
      const matches =
        fetchRes.hash === ref.storedHash || fetchRes.rawHash === ref.storedHash;

      if (matches) {
        result.unchangedCount++;
      } else {
        result.changedCount++;
        result.changes.push({
          url,
          playbookId: ref.playbookId,
          storedHash: ref.storedHash,
          currentHash: fetchRes.hash,
          accessedOn: ref.accessedOn,
          fetchDate: fetchRes.fetchDate,
        });

        if (!options.quiet) {
          console.log(
            `[CHANGED] ${ref.playbookId}: hash changed for ${url}\n` +
              `          Stored:  ${ref.storedHash} (accessed ${ref.accessedOn || 'unknown'})\n` +
              `          Current: ${fetchRes.hash} (fetched ${fetchRes.fetchDate})`,
          );
        }
      }
    }
  }

  if (!options.quiet) {
    console.log('\n=== Recheck Sources Summary ===');
    console.log(`Total URLs:   ${result.totalSources}`);
    console.log(`Unchanged:    ${result.unchangedCount}`);
    console.log(`Hash Changed: ${result.changedCount}`);
    console.log(`Failed/Skip:  ${result.failedCount + result.skippedCount}`);
    console.log('Result: Informational check completed.\n');
  }

  return result;
}
