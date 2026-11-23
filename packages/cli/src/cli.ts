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
import { verifyPlaybook } from './commands/verify.js';
import { checkAiPlaybook } from './commands/check_ai.js';
import { packetPlaybook } from './commands/packet.js';
import { recheckAllSources } from './commands/recheck.js';
import { getStats, printStats } from './commands/stats.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
CancelSpec CLI

Usage:
  cancelspec lint [paths...]       Lint one or all playbooks
  cancelspec new <region> <id>     Scaffold a new playbook
  cancelspec verify <path>         Verify a playbook with --handle
  cancelspec check-ai <path>       Check a playbook using AI-assisted verification
  cancelspec scaffold-targets [file] Scaffold drafts for all targets in file
  cancelspec queue                 Print human verification queue
  cancelspec stats [targets-file]  Print playbook and target statistics
  cancelspec packet <id|path>      Fetch source and print steps beside source text
  cancelspec recheck               Re-fetch all sources and report changed hashes
  cancelspec build                 Build release bundles and index
  cancelspec release-check         Run pre-release validation suite
  cancelspec --help                Show this help message

Options:
  --handle <handle>                Human verifier handle (required for verify)
  --method <method>                Verification method (official-help-page, first-hand, community-report)
  --min-active <N>                 Require at least N active human-verified playbooks (release-check)
  --allow-ai-assisted              Allow AI-assisted playbooks towards --min-active (release-check)
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
      const allowAiAssisted = args.includes('--allow-ai-assisted');
      const minActiveIdx = args.indexOf('--min-active');
      const minActive =
        minActiveIdx !== -1 && args[minActiveIdx + 1] && !args[minActiveIdx + 1]?.startsWith('--')
          ? parseInt(args[minActiveIdx + 1]!, 10)
          : undefined;

      const result = runReleaseCheck(playbooksDir, {
        quiet,
        strictDrafts,
        minActive,
        allowAiAssisted,
      });
      if (!result.passed) {
        process.exit(1);
      }
      break;
    }

    case 'packet': {
      const playbookId = args[1];
      if (!playbookId || playbookId.startsWith('--')) {
        console.error('Error: playbook id or path is required for packet.');
        console.error('Usage: cancelspec packet <playbook-id>');
        process.exit(1);
      }
      const quiet = args.includes('--quiet');
      try {
        await packetPlaybook(playbooksDir, playbookId, { quiet });
      } catch (err) {
        console.error(`Packet failed: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'recheck': {
      const quiet = args.includes('--quiet');
      try {
        await recheckAllSources(playbooksDir, { quiet });
      } catch (err) {
        console.error(`Recheck failed: ${(err as Error).message}`);
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

    case 'stats': {
      const targetsPath = args[1] && !args[1].startsWith('--') ? args[1] : undefined;
      const quiet = args.includes('--quiet');
      const stats = getStats(playbooksDir, targetsPath);
      if (!quiet) {
        printStats(stats);
      }
      break;
    }

    case 'verify': {
      const filePath = args[1];
      if (!filePath || filePath.startsWith('--')) {
        console.error('Error: playbook file path is required for verify.');
        console.error('Usage: cancelspec verify <path> --handle <handle> [--method <method>]');
        process.exit(1);
      }

      const handleIdx = args.indexOf('--handle');
      const handle = handleIdx !== -1 && args[handleIdx + 1] && !args[handleIdx + 1]?.startsWith('--')
        ? args[handleIdx + 1]
        : undefined;

      const methodIdx = args.indexOf('--method');
      const method = methodIdx !== -1 && args[methodIdx + 1] && !args[methodIdx + 1]?.startsWith('--')
        ? args[methodIdx + 1]
        : undefined;

      if (!handle) {
        console.error('Error: --handle is required for verification.');
        console.error('Usage: cancelspec verify <path> --handle <handle> [--method <method>]');
        process.exit(1);
      }

      try {
        const { playbook } = verifyPlaybook(resolve(filePath), { handle, method });
        console.log(`✓ Verified ${playbook.id}: status set to active by ${handle}`);
      } catch (err) {
        console.error(`Verification failed: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'check-ai': {
      const filePath = args[1];
      if (!filePath || filePath.startsWith('--')) {
        console.error('Error: playbook file path is required for check-ai.');
        console.error('Usage: cancelspec check-ai <path>');
        process.exit(1);
      }

      try {
        const { playbook } = checkAiPlaybook(resolve(filePath));
        console.log(`✓ AI-assisted check completed for ${playbook.id}: status set to active (ai-assisted)`);
      } catch (err) {
        console.error(`check-ai failed: ${(err as Error).message}`);
        process.exit(1);
      }
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
