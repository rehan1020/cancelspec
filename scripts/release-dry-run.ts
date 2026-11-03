// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runReleaseCheck } from '../packages/cli/src/commands/release_check.js';
import { buildDataBundle } from '../packages/cli/src/commands/build.js';

export function runReleaseDryRun(
  options: { quiet?: boolean; strictDrafts?: boolean } = {},
): boolean {
  const rootDir = process.cwd();
  const playbooksDir = join(rootDir, 'playbooks');
  const distDir = join(rootDir, 'dist');
  const dataDistDir = join(distDir, 'data');

  mkdirSync(dataDistDir, { recursive: true });

  if (!options.quiet) {
    console.log('========================================');
    console.log('       CancelSpec Release Dry-Run       ');
    console.log('========================================\n');
  }

  // 1. Release readiness check
  const checkResult = runReleaseCheck(playbooksDir, {
    quiet: options.quiet ?? false,
    strictDrafts: options.strictDrafts,
  });
  if (!checkResult.passed) {
    console.error('\n✗ Release readiness checks failed.');
    return false;
  }

  // 2. Build release bundle
  const { latestPath, versionedPath, count } = buildDataBundle(playbooksDir, {
    outDir: dataDistDir,
    quiet: true,
  });

  // 3. Generate SHA-256 checksums
  const latestBuf = readFileSync(latestPath);
  const versionedBuf = readFileSync(versionedPath);

  const hashLatest = createHash('sha256').update(latestBuf).digest('hex');
  const hashVersioned = createHash('sha256').update(versionedBuf).digest('hex');

  const sumsContent = `${hashVersioned}  ${versionedPath.split(/[/\\]/).pop()}\n${hashLatest}  ${latestPath.split(/[/\\]/).pop()}\n`;
  const sumsPath = join(dataDistDir, 'SHA256SUMS.txt');
  writeFileSync(sumsPath, sumsContent, 'utf8');

  console.log(`\n✓ Generated release checksums: ${sumsPath}`);

  // 4. Generate SBOM (Software Bill of Materials)
  try {
    const sbomJson = execSync('npm sbom --sbom-format=cyclonedx', {
      encoding: 'utf8',
      cwd: rootDir,
    });
    const sbomPath = join(distDir, 'sbom.json');
    writeFileSync(sbomPath, sbomJson, 'utf8');
    console.log(`✓ Generated CycloneDX SBOM: ${sbomPath}`);
  } catch (err) {
    console.error('Warning: SBOM generation failed:', (err as Error).message);
  }

  // 5. Test npm packaging dry-run
  try {
    execSync('npm pack --dry-run --workspaces', {
      stdio: 'pipe',
      cwd: rootDir,
    });
    console.log('✓ npm workspace packaging dry-run passed.');
  } catch (err) {
    console.error('Warning: npm pack dry-run reported issues:', (err as Error).message);
  }

  console.log('\n========================================');
  console.log(`✓ Release Dry-Run Successful! (${count} playbooks)`);
  console.log('========================================\n');

  return true;
}

if (process.argv[1]?.endsWith('release-dry-run.ts') || process.argv[1]?.endsWith('release-dry-run.js')) {
  const success = runReleaseDryRun();
  if (!success) {
    process.exit(1);
  }
}
