// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REGIONS, validatePlaybook, type Playbook } from '@cancelspec/spec';
import { parse } from 'yaml';

export interface LintOptions {
  strict?: boolean | undefined;
  quiet?: boolean | undefined;
}

export interface LintResult {
  passed: boolean;
  fileCount: number;
  errorCount: number;
  warningCount: number;
}

export function lintFiles(filePaths: string[], options: LintOptions = {}): LintResult {
  let fileCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  // Track aliases and merchant patterns by region to detect collisions
  const seenAliasesByRegion = new Map<string, Map<string, string>>();
  const seenPatternsByRegion = new Map<string, Map<string, string>>();

  for (const filePath of filePaths) {
    fileCount++;
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch (err) {
      errorCount++;
      if (!options.quiet) {
        console.error(`✗ ${filePath}: Failed to read file: ${(err as Error).message}`);
      }
      continue;
    }

    let data: unknown;
    try {
      data = parse(content);
    } catch (err) {
      errorCount++;
      if (!options.quiet) {
        console.error(`✗ ${filePath}: YAML parse error: ${(err as Error).message}`);
      }
      continue;
    }

    const validation = validatePlaybook(data);

    // Extract region from path if possible: playbooks/REGION/service-id.yaml
    const parts = filePath.replace(/\\/g, '/').split('/');
    const regionIdx = parts.indexOf('playbooks');
    const region = regionIdx !== -1 && parts[regionIdx + 1] ? parts[regionIdx + 1]! : 'GLOBAL';

    // Check collisions if playbook is a valid object with an id
    if (validation.valid && typeof (data as Playbook).id === 'string') {
      const pb = data as Playbook;

      if (!seenAliasesByRegion.has(region)) {
        seenAliasesByRegion.set(region, new Map());
      }
      if (!seenPatternsByRegion.has(region)) {
        seenPatternsByRegion.set(region, new Map());
      }

      const regionAliases = seenAliasesByRegion.get(region)!;
      const regionPatterns = seenPatternsByRegion.get(region)!;

      // Check aliases
      if (pb.aliases) {
        for (const alias of pb.aliases) {
          const key = alias.toLowerCase();
          const prev = regionAliases.get(key);
          if (prev && prev !== pb.id) {
            validation.warnings.push({
              path: 'aliases',
              message: `Alias collision: "${alias}" is also used by service "${prev}" in region ${region}`,
            });
          } else {
            regionAliases.set(key, pb.id);
          }
        }
      }

      // Check merchant patterns
      for (const pattern of pb.merchant_patterns) {
        const prev = regionPatterns.get(pattern);
        if (prev && prev !== pb.id) {
          validation.warnings.push({
            path: 'merchant_patterns',
            message: `Pattern collision: "${pattern}" is also registered by service "${prev}" in region ${region}`,
          });
        } else {
          regionPatterns.set(pattern, pb.id);
        }
      }
    }

    if (!validation.valid) {
      errorCount += validation.errors.length;
      if (!options.quiet) {
        console.error(`✗ ${filePath}`);
        for (const err of validation.errors) {
          console.error(`    Error [${err.path || 'root'}]: ${err.message}`);
        }
      }
    } else if (validation.warnings.length > 0 && !options.quiet) {
      warningCount += validation.warnings.length;
      console.warn(`⚠ ${filePath}`);
      for (const warn of validation.warnings) {
        console.warn(`    Warning [${warn.path}]: ${warn.message}`);
      }
    } else if (!options.quiet) {
      console.log(`✓ ${filePath}`);
    }
  }

  const passed = errorCount === 0 && (!options.strict || warningCount === 0);
  return { passed, fileCount, errorCount, warningCount };
}

export function lintAllPlaybooks(playbooksDir: string, options: LintOptions = {}): LintResult {
  const files: string[] = [];

  for (const region of REGIONS) {
    const regionDir = join(playbooksDir, region);
    try {
      if (statSync(regionDir).isDirectory()) {
        const entries = readdirSync(regionDir);
        for (const file of entries) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            files.push(join(regionDir, file));
          }
        }
      }
    } catch {
      // directory doesn't exist
    }
  }

  return lintFiles(files, options);
}
