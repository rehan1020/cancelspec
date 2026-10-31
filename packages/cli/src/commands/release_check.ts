// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { loadAllPlaybooks } from '@cancelspec/core';
import { lintAllPlaybooks } from './lint.js';
import { buildDataBundle } from './build.js';

export interface ReleaseCheckOptions {
  referenceDate?: Date | undefined;
  quiet?: boolean | undefined;
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

  // 2. Draft check (for a release, all playbooks must be verified and non-draft)
  const allPlaybooks = loadAllPlaybooks(playbooksDir, {
    includeDrafts: true,
    referenceDate: refDate,
  });
  const draftPlaybooks = allPlaybooks.filter((p) => p.status === 'draft');
  const draftsPassed = draftPlaybooks.length === 0;
  checks.push({
    name: 'Draft Status Check',
    passed: draftsPassed,
    message: draftsPassed
      ? 'Zero playbooks in draft status.'
      : `${draftPlaybooks.length} playbooks are still in draft status: ${draftPlaybooks.map((p) => p.id).join(', ')}.`,
  });

  // 3. Staleness audit
  const stalePlaybooks = allPlaybooks.filter((p) => p.staleness_days > 180);
  checks.push({
    name: 'Staleness Audit',
    passed: stalePlaybooks.length === 0,
    message:
      stalePlaybooks.length === 0
        ? 'All playbooks verified within the last 180 days.'
        : `${stalePlaybooks.length} playbooks have not been verified in >180 days: ${stalePlaybooks.map((p) => `${p.id} (${p.staleness_days}d)`).join(', ')}.`,
  });

  // 4. Bundle build
  let buildPassed = false;
  let buildMsg = '';
  try {
    const buildResult = buildDataBundle(playbooksDir, {
      referenceDate: refDate,
      quiet: true,
    });
    buildPassed = buildResult.count > 0;
    buildMsg = `Built bundle containing ${buildResult.count} playbooks.`;
  } catch (err) {
    buildMsg = `Bundle build failed: ${(err as Error).message}`;
  }
  checks.push({
    name: 'Bundle Compilation',
    passed: buildPassed,
    message: buildMsg,
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
