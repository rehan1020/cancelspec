// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadAllPlaybooks } from '@cancelspec/core';
import { lintAllPlaybooks } from './lint.js';
import { buildDataBundle } from './build.js';

function findProjectConfigFile(startDir = process.cwd()): string | null {
  let curr = resolve(startDir);
  while (true) {
    const candidate = join(curr, 'project.config');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

export interface ReleaseCheckOptions {
  referenceDate?: Date | undefined;
  quiet?: boolean | undefined;
  strictDrafts?: boolean | undefined;
}

export interface ReleaseCheckResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export function runReleaseCheck(
  playbooksDir: string,
  options: ReleaseCheckOptions = {},
): ReleaseCheckResult {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];
  const refDate = options.referenceDate || new Date();

  // 1. Playbook linting
  const lintResult = lintAllPlaybooks(playbooksDir, { quiet: true });
  checks.push({
    name: 'Playbook Linting',
    passed: lintResult.passed,
    message: lintResult.passed
      ? `All ${lintResult.fileCount} playbooks valid.`
      : `Failed with ${lintResult.errorCount} errors.`,
  });

  // 2. Draft check (for a release tag, all playbooks must be verified and non-draft)
  const allPlaybooks = loadAllPlaybooks(playbooksDir, {
    includeDrafts: true,
    referenceDate: refDate,
  });
  const draftPlaybooks = allPlaybooks.filter((p) => p.status === 'draft');
  const draftsPassed = options.strictDrafts ? draftPlaybooks.length === 0 : true;
  checks.push({
    name: 'Draft Status Check',
    passed: draftsPassed,
    message:
      draftPlaybooks.length === 0
        ? 'Zero playbooks in draft status.'
        : options.strictDrafts
          ? `${draftPlaybooks.length} playbooks are still in draft status: ${draftPlaybooks.map((p) => p.id).join(', ')}.`
          : `${draftPlaybooks.length} playbooks in draft status (safely excluded from release).`,
  });

  // 3. Staleness audit
  const stalePlaybooks = allPlaybooks.filter((p) => p.status !== 'draft' && p.staleness_days > 180);
  checks.push({
    name: 'Staleness Audit',
    passed: stalePlaybooks.length === 0,
    message:
      stalePlaybooks.length === 0
        ? 'All playbooks verified within the last 180 days.'
        : `${stalePlaybooks.length} playbooks have not been verified in >180 days: ${stalePlaybooks.map((p) => `${p.id} (${p.staleness_days}d)`).join(', ')}.`,
  });

  // 4. Bundle build & zero-drafts verification
  let buildPassed = false;
  let buildMsg = '';
  try {
    const buildResult = buildDataBundle(playbooksDir, {
      referenceDate: refDate,
      quiet: true,
      includeDrafts: false,
    });
    const bundleContent = JSON.parse(readFileSync(buildResult.latestPath, 'utf8'));
    const bundleDrafts = (bundleContent.playbooks || []).filter(
      (p: { status?: string }) => p.status === 'draft',
    );
    if (bundleDrafts.length > 0) {
      buildPassed = false;
      buildMsg = `Bundle failed: contains ${bundleDrafts.length} draft playbooks (${bundleDrafts.map((d: any) => d.id).join(', ')}). Drafts must never reach the bundle.`;
    } else {
      buildPassed = true;
      buildMsg = `Built bundle containing ${buildResult.count} playbooks (0 drafts).`;
    }
  } catch (err) {
    buildMsg = `Bundle build failed: ${(err as Error).message}`;
  }
  checks.push({
    name: 'Bundle Compilation',
    passed: buildPassed,
    message: buildMsg,
  });

  // 5. Configuration Clearance (placeholders check)
  let configPassed = true;
  let configMsg = 'project.config configuration verified.';
  try {
    const configPath = findProjectConfigFile(playbooksDir) || join(process.cwd(), 'project.config');
    const cfgRaw = readFileSync(configPath, 'utf8');
    const hasPlaceholders = cfgRaw.includes('REPLACE_ME');
    if (hasPlaceholders) {
      if (options.strictDrafts) {
        configPassed = false;
        configMsg = 'project.config contains placeholder values (REPLACE_ME). Release builds cannot proceed until configured.';
      } else {
        configPassed = true;
        configMsg = 'project.config contains placeholder values (REPLACE_ME). Warning: maintainer must configure before release.';
      }
    }
  } catch (err) {
    configPassed = false;
    configMsg = `Failed to read project.config: ${(err as Error).message}`;
  }
  checks.push({
    name: 'Project Configuration',
    passed: configPassed,
    message: configMsg,
  });

  const passed = checks.every((c) => c.passed);

  if (!options.quiet) {
    console.log('\n=== Release Readiness Check ===\n');
    for (const c of checks) {
      const mark = c.passed ? '✓' : '✗';
      console.log(`${mark} ${c.name}: ${c.message}`);
    }
    console.log('\nResult: ' + (passed ? 'READY FOR RELEASE' : 'BLOCKED'));
  }

  return { passed, checks };
}
