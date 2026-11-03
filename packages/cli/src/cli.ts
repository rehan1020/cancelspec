#!/usr/bin/env node

// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { join, resolve } from 'node:path';
import { buildSite } from '@cancelspec/site-builder';
import { lintAllPlaybooks, lintFiles } from './commands/lint.js';
import { scaffoldPlaybook } from './commands/new.js';
import { buildDataBundle } from './commands/build.js';
import { runReleaseCheck } from './commands/release_check.js';
import { scaffoldAllTargets } from './commands/targets.js';
import { printVerificationQueue } from './commands/queue.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
CancelSpec CLI

Usage:
  cancelspec lint [paths...]       Lint one or all playbooks
  cancelspec new <region> <id>     Scaffold a new playbook
  cancelspec scaffold-targets [file] Scaffold drafts for all targets in file
  cancelspec queue                 Print human verification queue
  cancelspec build                 Build release bundles and index
  cancelspec release-check         Run pre-release validation suite
  cancelspec --help                Show this help message

Options:
  --strict                         Treat warnings as errors (lint)
  --strict-drafts                  Enforce zero drafts during release-check
  --include-drafts                 Include draft playbooks (local preview only; never deploy)
  --quiet                          Suppress non-error output
  --outDir <path>                  Output directory for build
`);
}

function findPlaybooksDir(): string {
  // Check cwd/playbooks, then ../../playbooks
  const cwdPlaybooks = join(process.cwd(), 'playbooks');
  return resolve(cwdPlaybooks);
}

async function main() {
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    process.exit(0);
  }

  const playbooksDir = findPlaybooksDir();

  switch (command) {
    case 'lint': {
      const paths = args.slice(1).filter((a) => !a.startsWith('--'));
      const strict = args.includes('--strict');
      const quiet = args.includes('--quiet');

      const result = paths.length > 0
        ? lintFiles(paths, { strict, quiet })
        : lintAllPlaybooks(playbooksDir, { strict, quiet });

      if (!result.passed) {
        process.exit(1);
      }
      break;
    }

    case 'new': {
      const region = args[1];
      const serviceId = args[2];
      const name = args[3];
      const force = args.includes('--force');

      if (!region || !serviceId) {
        console.error('Error: region and service-id are required.');
        console.error('Usage: cancelspec new <region> <service-id> [service-name]');
        console.error('Example: cancelspec new GLOBAL my-service "My Service"');
        process.exit(1);
      }

      try {
        const { filePath } = scaffoldPlaybook(playbooksDir, region, serviceId, {
          name,
          force,
        });
        console.log(`✓ Scaffolded new playbook draft at ${filePath}`);
        console.log(`Note: Playbook contains placeholders (TODO). Fill in verified_on, verification_method, and sources before lint will pass.`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'build': {
      const outDirIdx = args.indexOf('--outDir');
      const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? args[outDirIdx + 1] : undefined;
      const quiet = args.includes('--quiet');
      const isSite = args.includes('--site');
      const includeDrafts = args.includes('--include-drafts');

      try {
        if (isSite) {
          buildSite({
            playbooksDir,
            outDir: outDir || join(process.cwd(), 'site'),
            quiet,
            includeDrafts,
          });
        } else {
          buildDataBundle(playbooksDir, { outDir, quiet, includeDrafts });
        }
      } catch (err) {
        console.error(`Build failed: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'release-check': {
      const quiet = args.includes('--quiet');
      const strictDrafts = args.includes('--strict-drafts') || args.includes('--strict');
      const result = runReleaseCheck(playbooksDir, { quiet, strictDrafts });
      if (!result.passed) {
        process.exit(1);
      }
      break;
    }

    case 'scaffold-targets': {
      const targetsPath = args[1] || 'targets.json';
      const force = args.includes('--force');
      const quiet = args.includes('--quiet');
      try {
        const { createdCount, skippedCount } = scaffoldAllTargets(playbooksDir, targetsPath, {
          force,
          quiet,
        });
        console.log(`\nFinished: Created ${createdCount} target drafts, skipped ${skippedCount}.`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'queue': {
      printVerificationQueue(playbooksDir);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Unexpected fatal error: ${err}`);
  process.exit(1);
});
