// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  REGIONS,
  validatePlaybook,
  type CompiledPlaybook,
  type Playbook,
  type Region,
} from '@cancelspec/spec';
import { parse } from 'yaml';
import { deriveMatcherKey } from './normalize.js';
import {
  computeDifficulty,
  computeStalenessDays,
  isAccessibleToCancel,
} from './scoring.js';

export interface LoadOptions {
  includeDrafts?: boolean | undefined;
  referenceDate?: Date | undefined;
}

export function compilePlaybook(
  rawPlaybook: Playbook,
  region: Region,
  referenceDate: Date = new Date(),
): CompiledPlaybook {
  return {
    ...rawPlaybook,
    region,
    kind: rawPlaybook.kind || 'service',
    outcome: rawPlaybook.outcome || 'cancel',
    difficulty: computeDifficulty(rawPlaybook),
    accessible_to_cancel: isAccessibleToCancel(rawPlaybook),
    staleness_days: computeStalenessDays(rawPlaybook.verified_on, referenceDate),
    matcher_key: deriveMatcherKey(rawPlaybook.name),
  };
}

export function loadPlaybookFromFile(
  filePath: string,
  region: Region,
  options: LoadOptions = {},
): CompiledPlaybook {
  const content = readFileSync(filePath, 'utf8');
  const data = parse(content) as unknown;

  const result = validatePlaybook(data);
  if (!result.valid) {
    const errorDetails = result.errors
      .map((e) => `  - ${e.path ? e.path + ': ' : ''}${e.message}`)
      .join('\n');
    throw new Error(`Validation failed for playbook at ${filePath}:\n${errorDetails}`);
  }

  const playbook = data as Playbook;
  return compilePlaybook(playbook, region, options.referenceDate);
}

export function loadAllPlaybooks(
  playbooksDir: string,
  options: LoadOptions = {},
): CompiledPlaybook[] {
  const playbooks: CompiledPlaybook[] = [];

  for (const region of REGIONS) {
    const regionDir = join(playbooksDir, region);

    let entries: string[] = [];
    try {
      if (statSync(regionDir).isDirectory()) {
        entries = readdirSync(regionDir);
      }
    } catch {
      continue;
    }

    const yamlFiles = entries
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
      .sort();

    for (const file of yamlFiles) {
      const filePath = join(regionDir, file);
      const compiled = loadPlaybookFromFile(filePath, region, options);

      if (!options.includeDrafts && compiled.status === 'draft') {
        continue;
      }

      playbooks.push(compiled);
    }
  }

  // Deterministic sort by region, then by id
  playbooks.sort((a, b) => {
    if (a.region !== b.region) {
      return a.region.localeCompare(b.region);
    }
    return a.id.localeCompare(b.id);
  });

  return playbooks;
}
