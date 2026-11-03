// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  createReleaseBundle,
  loadAllPlaybooks,
  serializeDeterministicJson,
} from '@cancelspec/core';

export interface BuildOptions {
  outDir?: string | undefined;
  referenceDate?: Date | undefined;
  quiet?: boolean | undefined;
  includeDrafts?: boolean | undefined;
}

export function buildDataBundle(
  playbooksDir: string,
  options: BuildOptions = {},
): { latestPath: string; versionedPath: string; count: number } {
  if (options.includeDrafts && !options.quiet) {
    console.warn(
      '⚠️  WARNING: --include-drafts is enabled for local preview only. This output contains unverified drafts and must NEVER be deployed to production!',
    );
  }

  const outDir = options.outDir || join(process.cwd(), 'dist', 'data');
  const playbooks = loadAllPlaybooks(playbooksDir, {
    referenceDate: options.referenceDate,
    includeDrafts: options.includeDrafts,
  });

  const bundle = createReleaseBundle(playbooks, {
    referenceDate: options.referenceDate,
  });

  const jsonContent = serializeDeterministicJson(bundle);

  const versionedPath = join(outDir, `bundle.${bundle.dataVersion}.json`);
  const latestPath = join(outDir, 'bundle.latest.json');

  mkdirSync(dirname(versionedPath), { recursive: true });
  writeFileSync(versionedPath, jsonContent, 'utf8');
  writeFileSync(latestPath, jsonContent, 'utf8');

  if (!options.quiet) {
    console.log(`✓ Release bundle built successfully!`);
    console.log(`  Playbooks included: ${bundle.count}`);
    console.log(`  Version: ${bundle.dataVersion}`);
    console.log(`  Output: ${latestPath}`);
    console.log(`          ${versionedPath}`);
  }

  return { latestPath, versionedPath, count: bundle.count };
}
