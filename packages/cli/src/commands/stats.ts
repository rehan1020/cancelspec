// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import type { Playbook } from '@cancelspec/spec';
import type { TargetEntry } from './targets.js';

export interface StatsResult {
  totalPlaybooks: number;
  byStatus: Record<string, number>;
  byRegion: Record<string, number>;
  byCategory: Record<string, number>;
  activeWithPatterns: number;
  activeWithoutPatterns: number;
  humanVerifiedActive: number;
  aiAssistedActive: number;
  draftsAwaitingVerification: number;
  targetsTotal: number;
  targetsWithoutDraftOrSkipCount: number;
  targetsWithoutDraftOrSkip: TargetEntry[];
}

function findTargetsFile(startDir = process.cwd(), explicitPath?: string): string | null {
  if (explicitPath) {
    const res = resolve(explicitPath);
    if (existsSync(res)) return res;
  }
  let curr = resolve(startDir);
  while (true) {
    const candidate = join(curr, 'targets.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

function collectYamlFiles(dir: string): Array<{ path: string; region: string }> {
  const results: Array<{ path: string; region: string }> = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Direct subdirectories of playbooksDir represent regions
      const region = entry;
      const subEntries = readdirSync(fullPath);
      for (const sub of subEntries) {
        if (sub.endsWith('.yaml') || sub.endsWith('.yml')) {
          results.push({ path: join(fullPath, sub), region });
        }
      }
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      results.push({ path: fullPath, region: 'UNKNOWN' });
    }
  }
  return results;
}

export function getStats(playbooksDir: string, targetsPath?: string): StatsResult {
  const yamlFiles = collectYamlFiles(playbooksDir);

  const byStatus: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  let activeWithPatterns = 0;
  let activeWithoutPatterns = 0;
  let humanVerifiedActive = 0;
  let aiAssistedActive = 0;
  let draftsAwaitingVerification = 0;

  const loadedPlaybookIds = new Set<string>();

  for (const file of yamlFiles) {
    try {
      const raw = readFileSync(file.path, 'utf8');
      const pb = parse(raw) as Playbook;
      if (!pb || typeof pb !== 'object') continue;

      if (pb.id) {
        loadedPlaybookIds.add(pb.id);
      }

      const status = pb.status || 'draft';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const region = file.region || 'UNKNOWN';
      byRegion[region] = (byRegion[region] || 0) + 1;

      const category = pb.category || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;

      if (status === 'active') {
        if (pb.verification_method === 'ai-assisted') {
          aiAssistedActive++;
        } else {
          humanVerifiedActive++;
        }
        const hasPattern = Array.isArray(pb.merchant_patterns) && pb.merchant_patterns.length > 0;
        if (hasPattern) {
          activeWithPatterns++;
        } else {
          activeWithoutPatterns++;
        }
      }

      if (status === 'draft') {
        draftsAwaitingVerification++;
      }
    } catch {
      // Ignore unparseable files in stats calculation
    }
  }

  // Load targets
  const actualTargetsPath = findTargetsFile(playbooksDir, targetsPath);
  let targetsTotal = 0;
  const targetsWithoutDraftOrSkip: TargetEntry[] = [];

  if (actualTargetsPath && existsSync(actualTargetsPath)) {
    try {
      const targetsRaw = readFileSync(actualTargetsPath, 'utf8');
      const targets = JSON.parse(targetsRaw) as TargetEntry[];
      if (Array.isArray(targets)) {
        targetsTotal = targets.length;
        for (const t of targets) {
          const hasDraftOrPlaybook = Boolean(t.id && loadedPlaybookIds.has(t.id));
          const hasSkipReason = typeof t.skipped_reason === 'string' && t.skipped_reason.trim().length > 0;
          if (!hasDraftOrPlaybook && !hasSkipReason) {
            targetsWithoutDraftOrSkip.push(t);
          }
        }
      }
    } catch {
      // Ignore errors reading targets.json
    }
  }

  return {
    totalPlaybooks: yamlFiles.length,
    byStatus,
    byRegion,
    byCategory,
    activeWithPatterns,
    activeWithoutPatterns,
    humanVerifiedActive,
    aiAssistedActive,
    draftsAwaitingVerification,
    targetsTotal,
    targetsWithoutDraftOrSkipCount: targetsWithoutDraftOrSkip.length,
    targetsWithoutDraftOrSkip,
  };
}

export function printStats(stats: StatsResult): void {
  console.log('\n=== CancelSpec Stats ===\n');

  console.log('Playbooks by Status:');
  const sortedStatuses = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]);
  if (sortedStatuses.length === 0) {
    console.log('  (none)');
  } else {
    for (const [st, count] of sortedStatuses) {
      console.log(`  - ${st}: ${count}`);
    }
  }

  console.log('\nPlaybooks by Region:');
  const sortedRegions = Object.entries(stats.byRegion).sort((a, b) => b[1] - a[1]);
  if (sortedRegions.length === 0) {
    console.log('  (none)');
  } else {
    for (const [reg, count] of sortedRegions) {
      console.log(`  - ${reg}: ${count}`);
    }
  }

  console.log('\nPlaybooks by Category:');
  const sortedCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length === 0) {
    console.log('  (none)');
  } else {
    for (const [cat, count] of sortedCategories) {
      console.log(`  - ${cat}: ${count}`);
    }
  }

  console.log('\nPattern Coverage (Active Playbooks):');
  console.log(`  - Active with patterns: ${stats.activeWithPatterns}`);
  console.log(`  - Active without patterns: ${stats.activeWithoutPatterns}`);

  console.log('\nVerification Pipeline:');
  console.log(`  - Human-verified active: ${stats.humanVerifiedActive}`);
  console.log(`  - AI-assisted active: ${stats.aiAssistedActive}`);
  console.log(`  - Drafts awaiting verification: ${stats.draftsAwaitingVerification}`);

  console.log('\nTargets Status (targets.json):');
  console.log(`  - Total targets: ${stats.targetsTotal}`);
  console.log(
    `  - Targets without a draft or skip reason: ${stats.targetsWithoutDraftOrSkipCount}`,
  );
  if (stats.targetsWithoutDraftOrSkip.length > 0) {
    for (const t of stats.targetsWithoutDraftOrSkip) {
      console.log(`    • ${t.id} (${t.region})`);
    }
  }
  console.log('');
}
