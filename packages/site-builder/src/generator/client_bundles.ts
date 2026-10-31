// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAliasIndex } from '@cancelspec/core';
import type { CompiledPlaybook } from '@cancelspec/spec';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildClientBundles(
  outDir: string,
  playbooks: CompiledPlaybook[],
): number {
  const scriptsDir = join(outDir, 'scripts');
  mkdirSync(scriptsDir, { recursive: true });

  const aliasIndex = buildAliasIndex(playbooks);

  // Resolve scanner client entry points
  // Check both ts source and dist locations
  const rootDir = resolve(__dirname, '../../../../');
  const appTs = join(rootDir, 'packages/scanner/src/client/browser-app.ts');
  const workerTs = join(rootDir, 'packages/scanner/src/client/worker-entry.ts');

  const appEntry = existsSync(appTs) ? appTs : resolve(__dirname, '../../scanner/dist/client/browser-app.js');
  const workerEntry = existsSync(workerTs) ? workerTs : resolve(__dirname, '../../scanner/dist/client/worker-entry.js');

  const appOutfile = join(scriptsDir, 'scanner-app.js');
  const workerOutfile = join(scriptsDir, 'scanner-worker.js');

  esbuild.buildSync({
    entryPoints: [appEntry],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    outfile: appOutfile,
  });

  esbuild.buildSync({
    entryPoints: [workerEntry],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    outfile: workerOutfile,
    define: {
      'globalThis.__CANCELEMBEDDED_INDEX__': JSON.stringify(aliasIndex),
    },
  });

  const appBytes = statSync(appOutfile).size;
  const workerBytes = statSync(workerOutfile).size;

  return appBytes + workerBytes;
}
