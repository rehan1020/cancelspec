// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { scaffoldPlaybook } from './new.js';

export interface TargetEntry {
  id?: string;
  name: string;
  region: string;
  website: string;
  category: string;
  priority: number;
  skipped_reason?: string;
}

export function loadTargetsFile(filePath: string): TargetEntry[] {
  if (!existsSync(filePath)) {
    throw new Error(`Targets file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    return parseYaml(raw) as TargetEntry[];
  }
  return JSON.parse(raw) as TargetEntry[];
}

export function scaffoldAllTargets(
  playbooksDir: string,
  targetsPath: string,
  options: { force?: boolean; quiet?: boolean } = {},
): { createdCount: number; skippedCount: number } {
  const targets = loadTargetsFile(targetsPath);
  let createdCount = 0;
  let skippedCount = 0;

  for (const t of targets) {
    const serviceId =
      t.id ||
      t.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    try {
      scaffoldPlaybook(playbooksDir, t.region, serviceId, {
        name: t.name,
        website: t.website,
        category: t.category,
        force: options.force,
      });
      createdCount++;
      if (!options.quiet) {
        console.log(`✓ Scaffolded target draft: ${t.region}/${serviceId}`);
      }
    } catch {
      skippedCount++;
    }
  }

  return { createdCount, skippedCount };
}
